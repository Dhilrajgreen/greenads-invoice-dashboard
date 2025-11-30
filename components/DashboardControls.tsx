'use client';

import { useState } from 'react';

interface DashboardControlsProps {
  onSync: () => Promise<void>;
  onExportExcel: () => Promise<void>;
  onFilterChange: (filter: string) => void;
  onSearchChange: (search: string) => void;
  onDateFilterChange: (type: 'date' | 'month' | 'year' | null, value: string) => void;
  onSortChange: (field: string, order: 'asc' | 'desc') => void;
  currentFilter: string;
  dateFilterType: 'date' | 'month' | 'year' | null;
  dateFilterValue: string;
  sortField: string;
  sortOrder: 'asc' | 'desc';
}

export default function DashboardControls({
  onSync,
  onExportExcel,
  onFilterChange,
  onSearchChange,
  onDateFilterChange,
  onSortChange,
  currentFilter,
  dateFilterType,
  dateFilterValue,
  sortField,
  sortOrder,
}: DashboardControlsProps) {
  const [syncLoading, setSyncLoading] = useState(false);
  const [excelExportLoading, setExcelExportLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [excelExportMessage, setExcelExportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSync = async () => {
    setSyncLoading(true);
    setSyncMessage(null);
    try {
      await onSync();
      setSyncMessage({ type: 'success', text: 'Sync completed successfully!' });
    } catch (error) {
      setSyncMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Sync failed',
      });
    } finally {
      setSyncLoading(false);
    }
  };

  const handleExportExcel = async () => {
    setExcelExportLoading(true);
    setExcelExportMessage(null);
    try {
      await onExportExcel();
      setExcelExportMessage({ type: 'success', text: 'Excel export completed successfully!' });
    } catch (error) {
      setExcelExportMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Excel export failed',
      });
    } finally {
      setExcelExportLoading(false);
    }
  };

  return (
    <div className="space-y-4 mb-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center">
        <button
          onClick={handleSync}
          disabled={syncLoading}
          className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
        >
          {syncLoading ? 'Syncing...' : 'Run Sync Now'}
        </button>
        <button
          onClick={handleExportExcel}
          disabled={excelExportLoading}
          className="w-full sm:w-auto px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
        >
          {excelExportLoading ? 'Exporting...' : 'Export to Excel'}
        </button>
      </div>

      {syncMessage && (
        <div
          className={`p-3 rounded-lg ${
            syncMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {syncMessage.text}
        </div>
      )}

      {excelExportMessage && (
        <div
          className={`p-3 rounded-lg ${
            excelExportMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {excelExportMessage.text}
        </div>
      )}

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center">
          <select
            value={currentFilter}
            onChange={(e) => onFilterChange(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="all">All</option>
            <option value="overdue">Overdue</option>
            <option value="due-1-5">Due in 1–5 days</option>
            <option value="due-6-30">Due in 6–30 days</option>
          </select>

          <input
            type="text"
            placeholder="Search by customer, invoice number, or salesperson..."
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full sm:flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center bg-gray-50 p-3 sm:p-4 rounded-lg">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <label className="text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap">Date Filter:</label>
            <select
              value={dateFilterType || ''}
              onChange={(e) => {
                const type = e.target.value as 'date' | 'month' | 'year' | '';
                onDateFilterChange(type ? (type as 'date' | 'month' | 'year') : null, '');
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">None</option>
              <option value="date">By Date</option>
              <option value="month">By Month</option>
              <option value="year">By Year</option>
            </select>

            {dateFilterType === 'date' && (
              <input
                type="date"
                value={dateFilterValue}
                onChange={(e) => onDateFilterChange('date', e.target.value)}
                className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            )}

            {dateFilterType === 'month' && (
              <input
                type="month"
                value={dateFilterValue}
                onChange={(e) => onDateFilterChange('month', e.target.value)}
                className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            )}

            {dateFilterType === 'year' && (
              <select
                value={dateFilterValue}
                onChange={(e) => onDateFilterChange('year', e.target.value)}
                className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">Select Year</option>
                {Array.from({ length: 10 }, (_, i) => {
                  const year = new Date().getFullYear() - i;
                  return (
                    <option key={year} value={year.toString()}>
                      {year}
                    </option>
                  );
                })}
              </select>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto sm:ml-auto">
            <label className="text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap">Sort By:</label>
            <select
              value={sortField}
              onChange={(e) => onSortChange(e.target.value, sortOrder)}
              className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="invoice_date">Invoice Date</option>
              <option value="internal_due_date">Due Date</option>
              <option value="invoice_number">Invoice Number</option>
              <option value="customer_name">Customer Name</option>
              <option value="invoice_total">Total Amount</option>
              <option value="balance">Balance</option>
            </select>

            <button
              onClick={() => onSortChange(sortField, sortOrder === 'asc' ? 'desc' : 'asc')}
              className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm flex items-center justify-center gap-1"
              title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            >
              {sortOrder === 'asc' ? '↑' : '↓'} {sortOrder === 'asc' ? 'Asc' : 'Desc'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

