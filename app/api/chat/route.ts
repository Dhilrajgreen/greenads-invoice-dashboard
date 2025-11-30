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

    // Format invoice data for context (limit to most recent 50 for better token efficiency and clarity)
    const recentInvoices = invoiceList.slice(0, 50);
    
    // Create a more readable text format instead of JSON
    const invoiceDataText = recentInvoices.map((inv, index) => {
      const dueDate = inv.internal_due_date ? new Date(inv.internal_due_date) : null;
      const invoiceDate = inv.invoice_date ? new Date(inv.invoice_date) : null;
      const daysOld = invoiceDate ? daysSinceInvoice(inv) : null;
      const isOverdueInvoice = isOverdue(inv);
      
      return `Invoice ${index + 1}:
- Invoice Number: ${inv.invoice_number || 'N/A'}
- Customer: ${inv.customer_name || 'Unknown'}
- Customer Email: ${inv.customer_email || 'N/A'}
- Customer Phone: ${inv.customer_phone || 'N/A'}
- Salesperson: ${inv.salesperson_name || 'N/A'}
- Invoice Date: ${invoiceDate ? invoiceDate.toLocaleDateString() : 'N/A'}
- Due Date: ${dueDate ? dueDate.toLocaleDateString() : 'N/A'}
- Invoice Total: ₹${(inv.invoice_total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Balance: ₹${(inv.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Days Old: ${daysOld !== null ? daysOld : 'N/A'}
- Status: ${isOverdueInvoice ? 'OVERDUE' : 'Not Overdue'}
---`;
    }).join('\n\n');

    // Create comprehensive context summary
    const uniqueCustomers = Array.from(new Set(invoiceList.map(inv => inv.customer_name).filter(Boolean)));
    const uniqueSalespeople = Array.from(new Set(invoiceList.map(inv => inv.salesperson_name).filter(Boolean)));
    
    const contextSummary = `INVOICE DATABASE - EXACT DATA ONLY:

SUMMARY STATISTICS:
- Total Unpaid Invoices: ${totalInvoices}
- Total Outstanding Amount: ₹${totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Overdue Invoices Count: ${overdueInvoices.length}
- Overdue Invoices Total Amount: ₹${totalOverdue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Due Soon (within 5 days) Count: ${dueSoon.length}
- Unique Customers Count: ${uniqueCustomers.length}
- Unique Salespeople Count: ${uniqueSalespeople.length}

CUSTOMER LIST: ${uniqueCustomers.slice(0, 20).join(', ')}${uniqueCustomers.length > 20 ? ` (and ${uniqueCustomers.length - 20} more)` : ''}

SALESPEOPLE LIST: ${uniqueSalespeople.slice(0, 20).join(', ')}${uniqueSalespeople.length > 20 ? ` (and ${uniqueSalespeople.length - 20} more)` : ''}

DETAILED INVOICE RECORDS (${recentInvoices.length} most recent):
${invoiceDataText}

IMPORTANT:
- All amounts are in Indian Rupees (₹)
- Current Date: ${new Date().toLocaleDateString()}
- Only use the EXACT data shown above
- Do NOT calculate, estimate, or infer anything not explicitly shown
`;

    // System prompt that enforces data-only responses
    const systemPrompt = `You are a precise data assistant for an invoice aging dashboard. You answer questions using ONLY the exact data provided below.

STRICT RULES - YOU MUST FOLLOW THESE:
1. Answer ONLY using the exact numbers, names, dates, and amounts shown in the data below
2. If information is NOT in the provided data, respond with: "I don't have that information in the database"
3. NEVER invent, estimate, approximate, or make up any data
4. NEVER use information from your training data - ONLY use the data provided
5. Use exact numbers from the data - do not round or estimate
6. Format currency as ₹ followed by the exact number with 2 decimal places
7. If asked about a customer not in the list, say they are not in the database
8. If asked about calculations not shown, say the calculation is not available
9. Be direct and factual - no speculation
10. If the data shows "N/A" or is missing, state that clearly

The user will ask questions. Answer using ONLY this data:`;

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
        temperature: 0.1, // Very low temperature for maximum precision and factual responses
        max_tokens: 800,
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

