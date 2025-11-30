import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { Invoice } from '@/types/invoice';
import { isOverdue, daysSinceInvoice } from '@/app/utils/invoiceHelpers';
import { formatCurrency } from '@/app/utils/currency';

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

    const messageLower = message.toLowerCase();

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

    // Calculate metrics
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

    // Question answering logic
    let response = '';

    // Total invoices
    if (
      messageLower.includes('total') &&
      (messageLower.includes('invoice') || messageLower.includes('count') || messageLower.includes('how many'))
    ) {
      response = `You have **${totalInvoices}** unpaid invoices in total.`;
    }
    // Total outstanding amount
    else if (
      messageLower.includes('total') &&
      (messageLower.includes('outstanding') || messageLower.includes('amount') || messageLower.includes('balance') || messageLower.includes('due'))
    ) {
      response = `The total outstanding amount across all unpaid invoices is **${formatCurrency(totalOutstanding)}**.`;
    }
    // Overdue invoices
    else if (messageLower.includes('overdue')) {
      if (messageLower.includes('how many') || messageLower.includes('count')) {
        response = `You have **${overdueInvoices.length}** overdue invoices.`;
      } else if (messageLower.includes('amount') || messageLower.includes('total')) {
        response = `The total amount overdue is **${formatCurrency(totalOverdue)}** across ${overdueInvoices.length} invoices.`;
      } else {
        response = `You have **${overdueInvoices.length}** overdue invoices with a total amount of **${formatCurrency(totalOverdue)}**.`;
      }
    }
    // Due soon (within 5 days)
    else if (messageLower.includes('due soon') || messageLower.includes('due in') || (messageLower.includes('due') && messageLower.includes('soon'))) {
      const dueSoonTotal = dueSoon.reduce((sum, inv) => sum + (inv.balance || 0), 0);
      response = `You have **${dueSoon.length}** invoices due within the next 5 days, totaling **${formatCurrency(dueSoonTotal)}**.`;
    }
    // Customer-related questions
    else if (messageLower.includes('customer') || messageLower.includes('client')) {
      const uniqueCustomers = new Set(invoiceList.map((inv) => inv.customer_name).filter(Boolean));
      if (messageLower.includes('how many') || messageLower.includes('count')) {
        response = `You have invoices from **${uniqueCustomers.size}** different customers.`;
      } else if (messageLower.includes('list') || messageLower.includes('who')) {
        const customerList = Array.from(uniqueCustomers).slice(0, 10).join(', ');
        response = `Here are some of your customers: ${customerList}${uniqueCustomers.size > 10 ? ` (and ${uniqueCustomers.size - 10} more)` : ''}.`;
      } else {
        response = `You have invoices from **${uniqueCustomers.size}** different customers.`;
      }
    }
    // Salesperson questions
    else if (messageLower.includes('salesperson') || messageLower.includes('sales rep')) {
      const salespeople = new Set(invoiceList.map((inv) => inv.salesperson_name).filter(Boolean));
      response = `Invoices are associated with **${salespeople.size}** different salespeople.`;
    }
    // Oldest/Newest invoices
    else if (messageLower.includes('oldest') || messageLower.includes('old')) {
      const sortedByDate = [...invoiceList].sort((a, b) => {
        const dateA = a.invoice_date ? new Date(a.invoice_date).getTime() : 0;
        const dateB = b.invoice_date ? new Date(b.invoice_date).getTime() : 0;
        return dateA - dateB;
      });
      const oldest = sortedByDate[0];
      if (oldest) {
        const daysOld = daysSinceInvoice(oldest);
        response = `Your oldest unpaid invoice is **${oldest.invoice_number || 'N/A'}** from ${oldest.customer_name || 'Unknown customer'}, dated ${oldest.invoice_date ? new Date(oldest.invoice_date).toLocaleDateString() : 'N/A'}. It's **${daysOld} days old** with a balance of **${formatCurrency(oldest.balance)}**.`;
      } else {
        response = 'I could not find the oldest invoice.';
      }
    }
    // Average invoice amount
    else if (messageLower.includes('average') && messageLower.includes('amount')) {
      const avgAmount = totalInvoices > 0 ? totalOutstanding / totalInvoices : 0;
      response = `The average outstanding amount per invoice is **${formatCurrency(avgAmount)}**.`;
    }
    // Largest invoice
    else if (messageLower.includes('largest') || messageLower.includes('biggest') || messageLower.includes('highest')) {
      const largest = invoiceList.reduce((max, inv) => 
        (inv.balance || 0) > (max.balance || 0) ? inv : max
      , invoiceList[0]);
      if (largest) {
        response = `Your largest unpaid invoice is **${largest.invoice_number || 'N/A'}** from ${largest.customer_name || 'Unknown customer'} with a balance of **${formatCurrency(largest.balance)}**.`;
      } else {
        response = 'I could not find the largest invoice.';
      }
    }
    // Search for specific customer
    else if (messageLower.includes('invoice') && messageLower.includes('from')) {
      const customerMatch = message.match(/from\s+([^?]+)/i) || message.match(/for\s+([^?]+)/i);
      if (customerMatch) {
        const customerName = customerMatch[1].trim();
        const customerInvoices = invoiceList.filter((inv) =>
          inv.customer_name?.toLowerCase().includes(customerName.toLowerCase())
        );
        if (customerInvoices.length > 0) {
          const customerTotal = customerInvoices.reduce((sum, inv) => sum + (inv.balance || 0), 0);
          response = `${customerName} has **${customerInvoices.length}** unpaid invoice(s) with a total outstanding amount of **${formatCurrency(customerTotal)}**.`;
        } else {
          response = `I couldn't find any unpaid invoices for ${customerName}.`;
        }
      } else {
        response = 'Could you please specify which customer you\'re asking about? For example: "How many invoices from [customer name]?"';
      }
    }
    // Help/Greeting
    else if (
      messageLower.includes('hello') ||
      messageLower.includes('hi') ||
      messageLower.includes('help') ||
      messageLower.includes('what can you')
    ) {
      response = `I can help you with questions about your invoices! Here are some things you can ask me:

• "How many total invoices do I have?"
• "What's the total outstanding amount?"
• "How many invoices are overdue?"
• "What's the total overdue amount?"
• "How many invoices are due soon?"
• "How many customers do I have?"
• "What's my oldest invoice?"
• "What's my largest invoice?"
• "What's the average invoice amount?"
• "How many invoices from [customer name]?"

Try asking me anything about your invoice data!`;
    }
    // Default response
    else {
      response = `I understand you're asking about "${message}". Here's a summary of your invoice data:

• **Total Invoices:** ${totalInvoices}
• **Total Outstanding:** ${formatCurrency(totalOutstanding)}
• **Overdue Invoices:** ${overdueInvoices.length} (${formatCurrency(totalOverdue)})
• **Due Soon (within 5 days):** ${dueSoon.length}

You can ask me specific questions like:
- "How many invoices are overdue?"
- "What's the total outstanding amount?"
- "How many customers do I have?"
- "What's my oldest invoice?"

What would you like to know more about?`;
    }

    return NextResponse.json({ response });
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

