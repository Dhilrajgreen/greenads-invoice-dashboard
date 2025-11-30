import { Invoice } from '@/types/invoice';

export function isOverdue(invoice: Invoice): boolean {
  if (!invoice.internal_due_date) return false;
  const dueDate = new Date(invoice.internal_due_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);
  return dueDate < today;
}

export function daysUntilDue(invoice: Invoice): number {
  if (!invoice.internal_due_date) return Infinity;
  const dueDate = new Date(invoice.internal_due_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);
  const diffTime = dueDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function daysSinceInvoice(invoice: Invoice): number {
  if (!invoice.invoice_date) return 0;
  const invoiceDate = new Date(invoice.invoice_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  invoiceDate.setHours(0, 0, 0, 0);
  const diffTime = today.getTime() - invoiceDate.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function getRowBackgroundClass(invoice: Invoice): string {
  if (isOverdue(invoice)) {
    return 'bg-red-50 hover:bg-red-100';
  }
  const daysUntil = daysUntilDue(invoice);
  if (daysUntil >= 0 && daysUntil <= 5) {
    return 'bg-yellow-50 hover:bg-yellow-100';
  }
  return 'bg-white hover:bg-gray-50';
}

