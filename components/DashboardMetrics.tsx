'use client';

import { Invoice } from '@/types/invoice';
import { isOverdue, daysUntilDue } from '@/app/utils/invoiceHelpers';
import { formatCurrency } from '@/app/utils/currency';

interface DashboardMetricsProps {
  invoices: Invoice[];
}

export default function DashboardMetrics({ invoices }: DashboardMetricsProps) {
  // Calculate metrics
  const totalCount = invoices.length;
  const totalOutstanding = invoices.reduce((sum, inv) => sum + (inv.balance || 0), 0);
  
  const overdueInvoices = invoices.filter((inv) => isOverdue(inv));
  const overdueCount = overdueInvoices.length;
  const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + (inv.balance || 0), 0);
  
  const dueSoonInvoices = invoices.filter((inv) => {
    const days = daysUntilDue(inv);
    return days >= 0 && days <= 5;
  });
  const dueSoonCount = dueSoonInvoices.length;
  const dueSoonAmount = dueSoonInvoices.reduce((sum, inv) => sum + (inv.balance || 0), 0);

  const metrics = [
    {
      label: 'Total Unpaid Invoices',
      value: totalCount.toLocaleString(),
      subtitle: formatCurrency(totalOutstanding),
      color: 'bg-blue-500',
      icon: '📄',
    },
    {
      label: 'Total Outstanding',
      value: formatCurrency(totalOutstanding),
      subtitle: `${totalCount} invoices`,
      color: 'bg-purple-500',
      icon: '💰',
    },
    {
      label: 'Overdue',
      value: overdueCount.toLocaleString(),
      subtitle: formatCurrency(overdueAmount),
      color: 'bg-red-500',
      icon: '⚠️',
    },
    {
      label: 'Due in 1-5 Days',
      value: dueSoonCount.toLocaleString(),
      subtitle: formatCurrency(dueSoonAmount),
      color: 'bg-yellow-500',
      icon: '⏰',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {metrics.map((metric, index) => (
        <div
          key={index}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow relative overflow-hidden"
        >
          <div className={`absolute top-0 right-0 w-20 h-20 ${metric.color} rounded-full -mr-10 -mt-10 opacity-10`}></div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">{metric.icon}</span>
              <p className="text-sm font-medium text-gray-600">{metric.label}</p>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">{metric.value}</p>
            {metric.subtitle && (
              <p className="text-sm text-gray-500">{metric.subtitle}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

