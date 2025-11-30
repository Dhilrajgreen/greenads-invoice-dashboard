import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { Invoice } from '@/types/invoice';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const invoices: Invoice[] = body.invoices || [];

    if (!invoices || invoices.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No invoices to export',
        },
        { status: 400 }
      );
    }

    // Prepare data for Excel
    const excelData = invoices.map((inv) => {
      const invoiceDate = inv.invoice_date ? new Date(inv.invoice_date) : null;
      const dueDate = inv.internal_due_date ? new Date(inv.internal_due_date) : null;
      const today = new Date();
      const daysOverdue = dueDate ? Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))) : 0;
      const daysSinceInvoice = invoiceDate ? Math.floor((today.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;

      return {
        'Invoice No': inv.invoice_number || '',
        'Customer Name': inv.customer_name || '',
        'Customer Email': inv.customer_email || '',
        'Customer Phone': inv.customer_phone || '',
        'Salesperson Name': inv.salesperson_name || '',
        'Zoho Status': inv.zoho_status || '',
        'Invoice Date': inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString() : '',
        'Internal Due Date': inv.internal_due_date ? new Date(inv.internal_due_date).toLocaleDateString() : '',
        'Total (₹)': inv.invoice_total || 0,
        'Balance (₹)': inv.balance || 0,
        'Age (days)': daysSinceInvoice,
        'Days Overdue': daysOverdue,
        'Status': inv.status || 'unpaid',
      };
    });

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    const columnWidths = [
      { wch: 15 }, // Invoice No
      { wch: 25 }, // Customer Name
      { wch: 30 }, // Customer Email
      { wch: 15 }, // Customer Phone
      { wch: 20 }, // Salesperson Name
      { wch: 15 }, // Zoho Status
      { wch: 12 }, // Invoice Date
      { wch: 15 }, // Internal Due Date
      { wch: 15 }, // Total
      { wch: 15 }, // Balance
      { wch: 12 }, // Age
      { wch: 15 }, // Days Overdue
      { wch: 10 }, // Status
    ];
    worksheet['!cols'] = columnWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Invoices');

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Create filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `greenadsglobal-invoices-${timestamp}.xlsx`;

    // Return Excel file as response
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Excel export error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

