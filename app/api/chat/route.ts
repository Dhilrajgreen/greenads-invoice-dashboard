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
    
    const contextSummary = `=== INVOICE DATABASE DATA ===

SUMMARY STATISTICS (use these exact numbers):
Total Unpaid Invoices: ${totalInvoices}
Total Outstanding Amount: ₹${totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
Overdue Invoices Count: ${overdueInvoices.length}
Overdue Invoices Total: ₹${totalOverdue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
Due Soon (within 5 days) Count: ${dueSoon.length}
Unique Customers: ${uniqueCustomers.length}
Unique Salespeople: ${uniqueSalespeople.length}
Current Date: ${new Date().toLocaleDateString()}

=== CUSTOMER LIST ===
${uniqueCustomers.slice(0, 100).map((c, i) => `${i + 1}. ${c}`).join('\n')}${uniqueCustomers.length > 100 ? `\n... and ${uniqueCustomers.length - 100} more customers` : ''}

=== SALESPEOPLE LIST ===
${uniqueSalespeople.slice(0, 100).map((s, i) => `${i + 1}. ${s}`).join('\n')}${uniqueSalespeople.length > 100 ? `\n... and ${uniqueSalespeople.length - 100} more salespeople` : ''}

=== INVOICE RECORDS (${recentInvoices.length} invoices) ===
${invoiceDataText}

=== END OF DATABASE ===
Remember: Use ONLY the data shown above. Do not use any other information.`;

    // System prompt that STRICTLY enforces database-only responses
    const systemPrompt = `You are a data assistant for an invoice aging dashboard. You MUST answer questions using ONLY the invoice data provided in the context below.

CRITICAL RULES - YOU MUST FOLLOW THESE EXACTLY:
1. IGNORE all knowledge from your training data. ONLY use the data provided below.
2. The invoice data is provided in the context below - USE IT to answer ALL questions.
3. For "how many" questions: Count from the invoice list or use the summary statistics provided.
4. For "total" or "amount" questions: Use the exact numbers from the summary or calculate from the invoice list.
5. For customer questions: Search the customer list or invoice records provided.
6. For invoice details: Look through the invoice records list provided.
7. NEVER make up numbers, names, dates, or any information.
8. If you cannot find something in the provided data, say "I don't see that in the database" - but FIRST check the data carefully.
9. Format currency as ₹ with 2 decimal places.
10. Be helpful and detailed, but ONLY use the provided data.

The context below contains the COMPLETE invoice database. Read it carefully and use it to answer the user's question.`;

    // Call OpenAI API
    try {
      console.log('Calling OpenAI API with message:', message.substring(0, 50));
      console.log('Total invoices in context:', totalInvoices);
      
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: `Here is the invoice database data:\n\n${contextSummary}\n\nNow answer this question using ONLY the data above: ${message}`,
          },
        ],
        temperature: 0.2,
        max_tokens: 1000,
      });

      const response = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
      
      console.log('OpenAI response received, length:', response.length);

      return NextResponse.json({ response });
    } catch (openaiError: any) {
      console.error('OpenAI API error details:', {
        message: openaiError?.message,
        status: openaiError?.status,
        code: openaiError?.code,
        type: openaiError?.type,
        error: openaiError,
      });
      
      // More detailed error message
      let errorMessage = 'I encountered an error with the AI service.';
      if (openaiError?.status === 401) {
        errorMessage = 'OpenAI API authentication failed. Please check the API key configuration.';
      } else if (openaiError?.status === 429) {
        errorMessage = 'OpenAI API rate limit exceeded. Please try again in a moment.';
      } else if (openaiError?.message) {
        errorMessage = `AI service error: ${openaiError.message}`;
      }
      
      // Fallback to basic response if OpenAI fails
      return NextResponse.json({
        response: `${errorMessage} Here's a quick summary: You have ${totalInvoices} unpaid invoices with a total outstanding of ${formatCurrency(totalOutstanding)}.`,
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

