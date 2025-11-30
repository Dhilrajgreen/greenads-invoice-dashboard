import { google } from 'googleapis';
import { Invoice } from '@/types/invoice';
import { formatCurrencyNumber } from '@/app/utils/currency';

/**
 * Gets authenticated Google Sheets client using service account
 */
function getGoogleSheetsClient() {
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!serviceAccountEmail || !privateKey) {
    throw new Error('Missing Google service account credentials');
  }

  const auth = new google.auth.JWT({
    email: serviceAccountEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
}

/**
 * Exports overdue invoices to Google Sheets
 */
export async function exportOverdueInvoicesToSheets(invoices: Invoice[]): Promise<number> {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const rangeName = process.env.GOOGLE_SHEETS_RANGE_NAME || 'OverdueInvoices!A1';

  if (!spreadsheetId) {
    throw new Error('Missing GOOGLE_SHEETS_SPREADSHEET_ID');
  }

  const sheets = getGoogleSheetsClient();
  const today = new Date();

  // Prepare data rows
  const rows = invoices.map((inv) => {
    const invoiceDate = inv.invoice_date ? new Date(inv.invoice_date) : null;
    const dueDate = inv.internal_due_date ? new Date(inv.internal_due_date) : null;
    const daysOverdue = dueDate ? Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))) : 0;

    return [
      inv.invoice_number || '',
      inv.customer_name || '',
      inv.customer_email || '',
      inv.customer_phone || '',
      inv.salesperson_name || '',
      inv.zoho_status || '',
      inv.invoice_date || '',
      inv.internal_due_date || '',
      inv.invoice_total?.toString() || '0',
      inv.balance?.toString() || '0',
      daysOverdue.toString(),
    ];
  });

  // Get the sheet name from range (e.g., "OverdueInvoices!A1" -> "OverdueInvoices")
  const sheetName = rangeName.split('!')[0];

  // First, write headers if the sheet is empty
  try {
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A1:K1`,
    });

    const hasHeaders = headerResponse.data.values && headerResponse.data.values.length > 0;

    if (!hasHeaders) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[
            'Invoice No',
            'Customer Name',
            'Customer Email',
            'Customer Phone',
            'Salesperson Name',
            'Zoho Status',
            'Invoice Date',
            'Internal Due Date',
            'Total',
            'Balance',
            'Days Overdue',
          ]],
        },
      });
    }
  } catch (error) {
    // If sheet doesn't exist or can't read, try to create it or just proceed
    console.warn('Could not check/update headers:', error);
  }

  // Append data rows
  if (rows.length > 0) {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:K`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: rows,
      },
    });
  }

  return rows.length;
}

