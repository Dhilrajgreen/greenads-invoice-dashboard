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

    // System prompt that makes the AI feel natural while using database data
    const systemPrompt = `You are a friendly and helpful AI assistant for an invoice aging dashboard. You help users understand their invoice data by answering questions in a natural, conversational way.

IMPORTANT GUIDELINES:
1. Answer questions using the invoice data provided in the user's message context
2. Be conversational, friendly, and helpful - like a knowledgeable colleague
3. Use the exact numbers and data from the provided context
4. Format currency amounts in Indian Rupees (₹) with proper formatting
5. If asked about something not in the data, politely say you don't have that information
6. Provide detailed, insightful answers when possible
7. Use natural language - don't sound robotic or template-like
8. You can analyze patterns, calculate totals, find specific invoices, etc. from the data
9. Be proactive in offering insights when relevant

The user will provide invoice database data in their message. Use that data to answer their question naturally and helpfully.`;

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
            content: `Based on the following invoice database information, please answer the user's question in a natural, helpful way:\n\n${contextSummary}\n\nUser's question: ${message}\n\nPlease provide a detailed, conversational answer using the data above.`,
          },
        ],
        temperature: 0.7, // Higher temperature for more natural, conversational responses
        max_tokens: 1500,
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

