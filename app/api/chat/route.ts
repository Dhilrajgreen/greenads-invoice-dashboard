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

    // Format invoice data for context (limit to most recent 100 for comprehensive answers)
    const recentInvoices = invoiceList.slice(0, 100);
    
    // Create a more readable text format instead of JSON
    const invoiceDataText = recentInvoices.map((inv, index) => {
      const dueDate = inv.internal_due_date ? new Date(inv.internal_due_date) : null;
      const invoiceDate = inv.invoice_date ? new Date(inv.invoice_date) : null;
      const daysOld = invoiceDate ? daysSinceInvoice(inv) : null;
      const isOverdueInvoice = isOverdue(inv);
      
      return `${index + 1}. Invoice #${inv.invoice_number || 'N/A'} | Customer: ${inv.customer_name || 'Unknown'} | Date: ${invoiceDate ? invoiceDate.toLocaleDateString() : 'N/A'} | Due: ${dueDate ? dueDate.toLocaleDateString() : 'N/A'} | Balance: ₹${(inv.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} | Total: ₹${(inv.invoice_total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} | Days Old: ${daysOld !== null ? daysOld : 'N/A'} | ${isOverdueInvoice ? 'OVERDUE' : 'Active'} | Salesperson: ${inv.salesperson_name || 'N/A'}`;
    }).join('\n');

    // Create comprehensive context summary
    const uniqueCustomers = Array.from(new Set(invoiceList.map(inv => inv.customer_name).filter(Boolean)));
    const uniqueSalespeople = Array.from(new Set(invoiceList.map(inv => inv.salesperson_name).filter(Boolean)));
    
    const contextSummary = `INVOICE DATABASE - ALL AVAILABLE DATA:

QUICK SUMMARY:
- Total Unpaid Invoices: ${totalInvoices}
- Total Outstanding Amount: ₹${totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Overdue Invoices: ${overdueInvoices.length} (Total: ₹${totalOverdue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
- Due Soon (within 5 days): ${dueSoon.length}
- Unique Customers: ${uniqueCustomers.length}
- Unique Salespeople: ${uniqueSalespeople.length}
- Current Date: ${new Date().toLocaleDateString()}

ALL CUSTOMERS IN DATABASE:
${uniqueCustomers.slice(0, 50).join(', ')}${uniqueCustomers.length > 50 ? `\n(and ${uniqueCustomers.length - 50} more customers)` : ''}

ALL SALESPEOPLE IN DATABASE:
${uniqueSalespeople.slice(0, 50).join(', ')}${uniqueSalespeople.length > 50 ? `\n(and ${uniqueSalespeople.length - 50} more salespeople)` : ''}

ALL INVOICE RECORDS (${recentInvoices.length} invoices):
${invoiceDataText}

You can use this data to answer questions. Calculate totals, find specific invoices, list customers, analyze patterns, etc. All amounts are in Indian Rupees (₹).
`;

    // System prompt that enforces data-only responses but encourages helpful answers
    const systemPrompt = `You are a helpful AI assistant for an invoice aging dashboard. Answer questions using the invoice data provided below.

IMPORTANT GUIDELINES:
1. Use the data provided below to answer questions - the data IS available, so use it!
2. You can calculate totals, averages, counts, and other metrics from the provided invoice data
3. You can search through the invoice list to find specific invoices, customers, or information
4. Format currency amounts in Indian Rupees (₹) with 2 decimal places
5. Be helpful and provide detailed answers when the data supports it
6. If asked about something truly not in the data (like a customer name that doesn't exist), then say it's not available
7. For questions like "how many", "what's the total", "list customers", etc. - USE THE DATA BELOW to answer
8. You can analyze patterns, find largest/smallest, calculate averages, etc. from the provided data
9. Be conversational and helpful while staying factual

The data below contains all your invoice information. Use it to answer questions:`;

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
        temperature: 0.4, // Balanced temperature for helpful but accurate responses
        max_tokens: 1000,
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

