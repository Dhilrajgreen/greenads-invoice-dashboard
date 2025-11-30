'use client';

import React, { useMemo, useState } from 'react';
import DashboardControls from './DashboardControls';
import DashboardMetrics from './DashboardMetrics';
import InvoiceTable from './InvoiceTable';
import SyncProgressModal from './SyncProgressModal';
import ChatBot from './ChatBot';
import { Invoice } from '@/types/invoice';
import { isOverdue, daysUntilDue } from '@/app/utils/invoiceHelpers';

interface DashboardClientProps {
  initialInvoices: Invoice[];
}

export default function DashboardClient({ initialInvoices }: DashboardClientProps) {
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [dateFilterType, setDateFilterType] = useState<'date' | 'month' | 'year' | null>(null);
  const [dateFilterValue, setDateFilterValue] = useState('');
  const [sortField, setSortField] = useState('internal_due_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('Starting sync...');
  const [syncProgress, setSyncProgress] = useState<number | null>(null);

  // Update invoices when initialInvoices changes (after sync)
  React.useEffect(() => {
    setInvoices(initialInvoices);
  }, [initialInvoices]);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncMessage('Starting sync...');
    setSyncProgress(0);

    try {
      const response = await fetch('/api/sync', { method: 'POST' });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.message) {
                setSyncMessage(data.message);
              }
              
              if (data.progress !== null && data.progress !== undefined) {
                setSyncProgress(data.progress);
              }

              // If sync completed successfully
              if (data.success && data.progress === 100) {
                setTimeout(() => {
                  setIsSyncing(false);
                  // Force a hard refresh to clear cache and show updated data
                  window.location.href = window.location.href;
                }, 1500);
              }

              // If there was an error
              if (data.success === false) {
                setSyncMessage(`Error: ${data.error || 'Unknown error'}`);
                setSyncProgress(null);
                setTimeout(() => {
                  setIsSyncing(false);
                }, 3000);
              }
            } catch (e) {
              // Ignore JSON parse errors for incomplete chunks
            }
          }
        }
      }
    } catch (error) {
      console.error('Sync error:', error);
      setSyncMessage(`Error: ${error instanceof Error ? error.message : 'Sync failed'}`);
      setSyncProgress(null);
      setTimeout(() => {
        setIsSyncing(false);
      }, 3000);
    }
  };

  const handleExportExcel = async () => {
    // Export filtered invoices to Excel
    const response = await fetch('/api/export-excel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ invoices: filteredInvoices }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Export failed' }));
      throw new Error(errorData.error || 'Excel export failed');
    }

    // Get the blob and download
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `greenadsglobal-invoices-${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  // Filter and sort invoices
  const filteredInvoices = useMemo(() => {
    let filtered = invoices;

    // Apply status filter
    if (filter === 'overdue') {
      filtered = filtered.filter((inv) => isOverdue(inv));
    } else if (filter === 'due-1-5') {
      filtered = filtered.filter((inv) => {
        const days = daysUntilDue(inv);
        return days >= 0 && days <= 5;
      });
    } else if (filter === 'due-6-30') {
      filtered = filtered.filter((inv) => {
        const days = daysUntilDue(inv);
        return days >= 6 && days <= 30;
      });
    }

    // Apply search filter
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (inv) =>
          inv.customer_name?.toLowerCase().includes(searchLower) ||
          inv.invoice_number?.toLowerCase().includes(searchLower) ||
          inv.salesperson_name?.toLowerCase().includes(searchLower)
      );
    }

    // Apply date filter
    if (dateFilterType && dateFilterValue) {
      filtered = filtered.filter((inv) => {
        if (!inv.invoice_date) return false;
        
        const invoiceDate = new Date(inv.invoice_date);
        
        if (dateFilterType === 'date') {
          const filterDate = new Date(dateFilterValue);
          return invoiceDate.toDateString() === filterDate.toDateString();
        } else if (dateFilterType === 'month') {
          const [year, month] = dateFilterValue.split('-');
          return invoiceDate.getFullYear() === parseInt(year) && 
                 invoiceDate.getMonth() + 1 === parseInt(month);
        } else if (dateFilterType === 'year') {
          return invoiceDate.getFullYear() === parseInt(dateFilterValue);
        }
        return true;
      });
    }

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'invoice_date':
          aValue = a.invoice_date ? new Date(a.invoice_date).getTime() : 0;
          bValue = b.invoice_date ? new Date(b.invoice_date).getTime() : 0;
          break;
        case 'internal_due_date':
          aValue = a.internal_due_date ? new Date(a.internal_due_date).getTime() : 0;
          bValue = b.internal_due_date ? new Date(b.internal_due_date).getTime() : 0;
          break;
        case 'invoice_number':
          aValue = a.invoice_number || '';
          bValue = b.invoice_number || '';
          break;
        case 'customer_name':
          aValue = a.customer_name || '';
          bValue = b.customer_name || '';
          break;
        case 'invoice_total':
          aValue = a.invoice_total || 0;
          bValue = b.invoice_total || 0;
          break;
        case 'balance':
          aValue = a.balance || 0;
          bValue = b.balance || 0;
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return filtered;
  }, [invoices, filter, search, dateFilterType, dateFilterValue, sortField, sortOrder]);

  return (
    <>
      <SyncProgressModal
        isOpen={isSyncing}
        message={syncMessage}
        progress={syncProgress}
        onClose={() => setIsSyncing(false)}
      />
      <DashboardMetrics invoices={filteredInvoices} />
      <DashboardControls
        onSync={handleSync}
        onExportExcel={handleExportExcel}
        onFilterChange={setFilter}
        onSearchChange={setSearch}
        onDateFilterChange={(type, value) => {
          setDateFilterType(type);
          setDateFilterValue(value);
        }}
        onSortChange={(field, order) => {
          setSortField(field);
          setSortOrder(order);
        }}
        currentFilter={filter}
        dateFilterType={dateFilterType}
        dateFilterValue={dateFilterValue}
        sortField={sortField}
        sortOrder={sortOrder}
      />
      <div className="mt-4 sm:mt-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">
          Invoices {filteredInvoices.length !== invoices.length && `(${filteredInvoices.length} of ${invoices.length})`}
        </h2>
        <InvoiceTable invoices={filteredInvoices}         />
      </div>
      <ChatBot />
    </>
  );
}

