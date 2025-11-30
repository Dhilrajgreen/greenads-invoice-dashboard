import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { Invoice } from '@/types/invoice';
import { isOverdue, daysSinceInvoice } from '@/app/utils/invoiceHelpers';
import { formatCurrency } from '@/app/utils/currency';
import OpenAI from 'openai';

// Initialize OpenAI client only when API key is available
function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new OpenAI({ apiKey });
}

export async function POST(request: Request) {
  try {
    const { message } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json({
        response: 'Sorry, the database is not configured. Please contact support.',
      });
    }

    // Check if OpenAI API key is configured
    const openai = getOpenAIClient();
    if (!openai) {
      return NextResponse.json({
        response: 'OpenAI API key is not configured. Please contact support.',
      });
    }

    // Fetch all invoices for analysis
    const { data: invoices, error } = await supabaseAdmin
      .from('invoices')
      .select('*')
      .eq('status', 'unpaid')
      .order('invoice_date', { ascending: false });

    if (error) {
      console.error('Error fetching invoices:', error);
      return NextResponse.json({
        response: 'Sorry, I encountered an error fetching invoice data. Please try again.',
      });
    }

    const invoiceList = (invoices as Invoice[]) || [];

    // Calculate metrics for context
    const totalInvoices = invoiceList.length;
    const totalOutstanding = invoiceList.reduce((sum, inv) => sum + (inv.balance || 0), 0);
    const overdueInvoices = invoiceList.filter((inv) => isOverdue(inv));
    const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + (inv.balance || 0), 0);
    const dueSoon = invoiceList.filter((inv) => {
      const dueDate = inv.internal_due_date ? new Date(inv.internal_due_date) : null;
      if (!dueDate) return false;
      const daysUntil = Math.floor((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return daysUntil >= 0 && daysUntil <= 5;
    });

    // Format invoice data for context (limit to most recent 100 for token efficiency)
    const recentInvoices = invoiceList.slice(0, 100);
    const invoiceDataContext = recentInvoices.map((inv) => {
      const dueDate = inv.internal_due_date ? new Date(inv.internal_due_date) : null;
      const invoiceDate = inv.invoice_date ? new Date(inv.invoice_date) : null;
      const daysOld = invoiceDate ? daysSinceInvoice(inv) : null;
      const isOverdueInvoice = isOverdue(inv);
      
      return {
        invoice_number: inv.invoice_number || 'N/A',
        customer_name: inv.customer_name || 'Unknown',
        customer_email: inv.customer_email || null,
        customer_phone: inv.customer_phone || null,
        salesperson_name: inv.salesperson_name || null,
        invoice_date: invoiceDate ? invoiceDate.toLocaleDateString() : 'N/A',
        invoice_total: inv.invoice_total || 0,
        balance: inv.balance || 0,
        internal_due_date: dueDate ? dueDate.toLocaleDateString() : 'N/A',
        days_old: daysOld,
        is_overdue: isOverdueInvoice,
        zoho_status: inv.zoho_status || 'unpaid',
      };
    });

    // Create comprehensive context summary
    const contextSummary = `
INVOICE DATABASE SUMMARY:
- Total Unpaid Invoices: ${totalInvoices}
- Total Outstanding Amount: ${formatCurrency(totalOutstanding)}
- Overdue Invoices: ${overdueInvoices.length} (Total: ${formatCurrency(totalOverdue)})
- Due Soon (within 5 days): ${dueSoon.length}
- Unique Customers: ${new Set(invoiceList.map(inv => inv.customer_name).filter(Boolean)).size}
- Unique Salespeople: ${new Set(invoiceList.map(inv => inv.salesperson_name).filter(Boolean)).size}

DETAILED INVOICE DATA (showing ${recentInvoices.length} most recent invoices):
${JSON.stringify(invoiceDataContext, null, 2)}

CURRENCY: All amounts are in Indian Rupees (₹).
CURRENT DATE: ${new Date().toLocaleDateString()}
`;

    // System prompt that enforces data-only responses
    const systemPrompt = `You are an AI assistant for an invoice aging dashboard. Your role is to answer questions about invoice data accurately and precisely.

CRITICAL RULES:
1. You MUST ONLY answer based on the invoice data provided in the context below
2. If the answer is not in the provided data, say "I don't have that information in the database" or "That data is not available"
3. NEVER make up numbers, dates, customer names, or any information
4. Use the exact data from the context - do not estimate or approximate
5. Format currency amounts using Indian Rupee (₹) symbol
6. Be precise with numbers and dates
7. If asked about data not in the context, clearly state it's not available
8. Provide specific details when available (invoice numbers, customer names, dates, amounts)
9. Calculate metrics only from the provided data
10. Be conversational but factual

Answer the user's question based ONLY on the following invoice data:`;

    // Call OpenAI API
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini', // Using gpt-4o-mini for cost efficiency, can be changed to gpt-4 if needed
        messages: [
          {
            role: 'system',
            content: `${systemPrompt}\n\n${contextSummary}`,
          },
          {
            role: 'user',
            content: message,
          },
        ],
        temperature: 0.3, // Lower temperature for more precise, factual responses
        max_tokens: 500,
      });

      const response = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

      return NextResponse.json({ response });
    } catch (openaiError: any) {
      console.error('OpenAI API error:', openaiError);
      
      // Fallback to basic response if OpenAI fails
      return NextResponse.json({
        response: `I encountered an error with the AI service. Here's a quick summary: You have ${totalInvoices} unpaid invoices with a total outstanding of ${formatCurrency(totalOutstanding)}. Please try again or contact support if the issue persists.`,
      });
    }

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      {
        response: 'Sorry, I encountered an error processing your question. Please try again.',
      },
      { status: 500 }
    );
  }
}

