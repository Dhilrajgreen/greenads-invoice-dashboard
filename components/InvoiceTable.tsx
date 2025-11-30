'use client';

import React, { useState, useEffect } from 'react';
import { Invoice } from '@/types/invoice';
import { isOverdue, daysUntilDue, daysSinceInvoice, getRowBackgroundClass } from '@/app/utils/invoiceHelpers';
import { formatCurrency } from '@/app/utils/currency';

interface InvoiceTableProps {
  invoices: Invoice[];
}

export default function InvoiceTable({ invoices }: InvoiceTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // Reset to page 1 when invoices change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [invoices.length]);

  if (invoices.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No invoices found. Click "Run Sync Now" to fetch invoices from Zoho.</p>
      </div>
    );
  }

  // Calculate pagination
  const totalPages = Math.ceil(invoices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedInvoices = invoices.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 rounded-lg text-xs sm:text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">
              Invoice No
            </th>
            <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b hidden sm:table-cell">
              Customer Name
            </th>
            <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b hidden lg:table-cell">
              Customer Email
            </th>
            <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b hidden lg:table-cell">
              Customer Phone
            </th>
            <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b hidden xl:table-cell">
              Salesperson Name
            </th>
            <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b hidden md:table-cell">
              Zoho Status
            </th>
            <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">
              Invoice Date
            </th>
            <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b hidden sm:table-cell">
              Due Date
            </th>
            <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">
              Total
            </th>
            <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">
              Balance
            </th>
            <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b hidden md:table-cell">
              Age (days)
            </th>
            <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b hidden sm:table-cell">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {paginatedInvoices.map((invoice) => {
            const rowClass = getRowBackgroundClass(invoice);
            return (
              <tr key={invoice.id} className={rowClass}>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-900 font-medium">
                  <div className="flex flex-col">
                    <span>{invoice.invoice_number || '-'}</span>
                    <span className="text-xs text-gray-500 sm:hidden mt-1">{invoice.customer_name || '-'}</span>
                  </div>
                </td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-900 hidden sm:table-cell">{invoice.customer_name || '-'}</td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-600 hidden lg:table-cell">{invoice.customer_email || '-'}</td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-600 hidden lg:table-cell">{invoice.customer_phone || '-'}</td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-600 hidden xl:table-cell">{invoice.salesperson_name || '-'}</td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 hidden md:table-cell">
                  <span className="px-2 py-1 text-xs rounded-full bg-gray-200 text-gray-800">
                    {invoice.zoho_status || '-'}
                  </span>
                </td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-900">
                  {invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString() : '-'}
                </td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-900 hidden sm:table-cell">
                  {invoice.internal_due_date ? new Date(invoice.internal_due_date).toLocaleDateString() : '-'}
                </td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-900 font-medium">
                  {formatCurrency(invoice.invoice_total)}
                </td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-900 font-medium">
                  {formatCurrency(invoice.balance)}
                </td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-900 hidden md:table-cell">{daysSinceInvoice(invoice)}</td>
                <td className="px-2 sm:px-4 py-2 sm:py-3 hidden sm:table-cell">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      invoice.status === 'paid' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
                    }`}
                  >
                    {invoice.status}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-200 bg-white px-3 sm:px-4 py-3 sm:px-6">
          <div className="flex flex-1 justify-between w-full sm:hidden">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-xs text-gray-600 self-center">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-700">
                Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                <span className="font-medium">{Math.min(endIndex, invoices.length)}</span> of{' '}
                <span className="font-medium">{invoices.length}</span> invoices
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
                >
                  <span className="sr-only">Previous</span>
                  ←
                </button>
                
                {/* Page numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => goToPage(pageNum)}
                      className={`relative inline-flex items-center px-2 sm:px-4 py-2 text-xs sm:text-sm font-semibold ${
                        currentPage === pageNum
                          ? 'z-10 bg-blue-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                          : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
                >
                  <span className="sr-only">Next</span>
                  →
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

