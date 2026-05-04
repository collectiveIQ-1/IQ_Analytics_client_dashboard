/**
 * IOMHelpDashboard.jsx — IOM Help client dashboard container.
 * Tab navigation: Home | Payments | Productions | Accounts Receivable | Insights | Procedure | IDR Payment Summary
 */

import { useState, useRef, useMemo } from 'react';
import { Home, DollarSign, TrendingUp, CreditCard, FileText, BarChart2, Activity } from 'lucide-react';
import IOMHelpHomePage        from '../iomhelp/IOMHelpHomePage';
import IOMHelpCleanClaimPage  from '../iomhelp/IOMHelpCleanClaimPage';
import IOMHelpPaymentsPage    from '../iomhelp/IOMHelpPaymentsPage';
import IOMHelpProductionPage  from '../iomhelp/IOMHelpProductionPage';
import IOMHelpArPage          from '../iomhelp/IOMHelpArPage';
import IOMHelpProcedurePage   from '../iomhelp/IOMHelpProcedurePage';
import IOMHelpInsightsPage    from '../iomhelp/IOMHelpInsightsPage';
import IOMHelpIDRPage         from '../iomhelp/IOMHelpIDRPage';
import ExportMenu             from '../../../components/dashboard/ExportMenu';

const TABS = [
  { id: 'home',        label: 'Home',                icon: Home },
  { id: 'payments',    label: 'Payments',             icon: DollarSign },
  { id: 'productions', label: 'Productions',          icon: TrendingUp },
  { id: 'ar',          label: 'Accounts Receivable',  icon: CreditCard },
  { id: 'insights',    label: 'Insights',             icon: BarChart2 },
  { id: 'procedure',   label: 'Procedure',            icon: FileText },
  { id: 'idr',         label: 'IDR Payment Summary',  icon: Activity },
];

export default function IOMHelpDashboard({ clientId }) {
  const [activeTab,  setActiveTab]  = useState('home');
  const [activeView, setActiveView] = useState('home');
  const contentRef = useRef(null);

  const handleNavigate = (view) => {
    if (view === 'ccr')      { setActiveView('ccr');     setActiveTab('home'); }
    if (view === 'payments') { setActiveTab('payments'); setActiveView('home'); }
  };

  const handleTabClick = (tabId) => { setActiveTab(tabId); setActiveView('home'); };

  const exportTitle = useMemo(() => {
    if (activeTab === 'home' && activeView === 'ccr') return 'IOM Help - Clean Claim Rate';
    const tab = TABS.find((t) => t.id === activeTab);
    return 'IOM Help - ' + (tab?.label ?? activeTab);
  }, [activeTab, activeView]);

  const exportFileName = useMemo(() => {
    const base = activeTab === 'home' && activeView === 'ccr'
      ? 'IOMHelp-CleanClaimRate'
      : 'IOMHelp-' + activeTab;
    return base + '-' + new Date().toISOString().slice(0, 10);
  }, [activeTab, activeView]);

  const datasourceItems = useMemo(() => {
    if (activeTab === 'home' && activeView === 'ccr') {
      return [{ id: 'ccr-history', label: 'CCR History', table: 'ccrhistory', endpoint: '/ionm/datasource?chart=ccr-history' }];
    }
    const DS = {
      home: [
        { id: 'payment-history',     label: 'Payment History',         table: 'payment_report',         endpoint: '/ionm/datasource?chart=payment-history' },
        { id: 'charges-vs-payments', label: 'Charges vs Payments',     table: 'billing_report_iomhelp', endpoint: '/ionm/datasource?chart=charges-vs-payments' },
        { id: 'ccr-history',         label: 'CCR History',             table: 'ccrhistory',             endpoint: '/ionm/datasource?chart=ccr-history' },
        { id: 'accounts-receivable', label: 'Accounts Receivable',     table: 'billing_report_iomhelp', endpoint: '/ionm/datasource?chart=accounts-receivable' },
      ],
      payments: [
        { id: 'payment-history',    label: 'Payment History',          table: 'payment_report', endpoint: '/ionm/datasource?chart=payment-history' },
        { id: 'payment-line',       label: 'Payment Trend',            table: 'payment_report', endpoint: '/ionm/datasource?chart=payment-line' },
        { id: 'deposits-surgeon',   label: 'Deposits by Surgeon',      table: 'payment_report', endpoint: '/ionm/datasource?chart=deposits-surgeon' },
        { id: 'deposits-hospital',  label: 'Deposits by Hospital',     table: 'payment_report', endpoint: '/ionm/datasource?chart=deposits-hospital' },
        { id: 'deposits-billing',   label: 'Deposits by Billing Type', table: 'payment_report', endpoint: '/ionm/datasource?chart=deposits-billing' },
        { id: 'deposits-insurance', label: 'Deposits by Insurance',    table: 'payment_report', endpoint: '/ionm/datasource?chart=deposits-insurance' },
      ],
      productions: [
        { id: 'production-dos', label: 'Production — DOS', table: 'billing_report_iomhelp', endpoint: '/ionm/datasource?chart=production-dos' },
        { id: 'production-doe', label: 'Production — DOE', table: 'billing_report_iomhelp', endpoint: '/ionm/datasource?chart=production-doe' },
      ],
      ar: [
        { id: 'ar-dos',       label: 'AR — Date of Service', table: 'billing_report_iomhelp', endpoint: '/ionm/datasource?chart=ar-dos' },
        { id: 'ar-doe',       label: 'AR — Date of Entry',   table: 'billing_report_iomhelp', endpoint: '/ionm/datasource?chart=ar-doe' },
        { id: 'ar-insurance', label: 'AR by Insurance',      table: 'billing_report_iomhelp', endpoint: '/ionm/datasource?chart=ar-insurance' },
        { id: 'ar-surgeon',   label: 'AR by Surgeon',        table: 'billing_report_iomhelp', endpoint: '/ionm/datasource?chart=ar-surgeon' },
      ],
      insights: [
        { id: 'insight-insurance',  label: 'Insights by Insurance',   table: 'billing_report_iomhelp', endpoint: '/ionm/datasource?chart=insight-insurance' },
        { id: 'insight-surgeon',    label: 'Insights by Surgeon',     table: 'billing_report_iomhelp', endpoint: '/ionm/datasource?chart=insight-surgeon' },
        { id: 'insight-reader',     label: 'Insights by Reader',      table: 'billing_report_iomhelp', endpoint: '/ionm/datasource?chart=insight-reader' },
        { id: 'insight-technician', label: 'Insights by Technician',  table: 'billing_report_iomhelp', endpoint: '/ionm/datasource?chart=insight-technician' },
      ],
      procedure: [
        { id: 'procedure-deposits', label: 'Procedure Deposits', table: 'payment_report',         endpoint: '/ionm/datasource?chart=procedure-deposits' },
        { id: 'procedure-charges',  label: 'Procedure Charges',  table: 'billing_report_iomhelp', endpoint: '/ionm/datasource?chart=procedure-charges' },
        { id: 'procedure-more',     label: 'Procedure Detail',   table: 'billing_report_iomhelp', endpoint: '/ionm/datasource?chart=procedure-more' },
      ],
      idr: [
        { id: 'idr-payments', label: 'IDR Payment Summary', table: 'smartsheet', endpoint: '/ionm/datasource?chart=idr-payments' },
      ],
    };
    return DS[activeTab] ?? null;
  }, [activeTab, activeView]);

  return (
    <div className="-mt-2" ref={contentRef}>
      <div className="flex items-center justify-between gap-2">
        <div className="overflow-x-auto flex-1">
          <nav className="flex gap-0.5 border-b border-slate-100 dark:border-zinc-800">
            {TABS.map(({ id, label, icon: Icon }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => handleTabClick(id)}
                  className={[
                    'flex items-center gap-2 px-4 py-3 text-sm font-semibold',
                    'whitespace-nowrap transition-all duration-150 border-b-2 -mb-px',
                    isActive
                      ? 'border-red-600 text-red-600 dark:text-red-400 dark:border-red-500'
                      : 'border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:border-slate-200 dark:hover:border-zinc-700',
                  ].join(' ')}
                >
                  <Icon size={14} />
                  {label}
                </button>
              );
            })}
          </nav>
        </div>
        <div className="pb-1 flex-shrink-0" data-export-ignore>
          <ExportMenu targetRef={contentRef} fileName={exportFileName} title={exportTitle} datasourceItems={datasourceItems} />
        </div>
      </div>

      <div className="pt-4">
        {activeTab === 'home' && activeView === 'home' && (
          <IOMHelpHomePage onNavigate={handleNavigate} />
        )}
        {activeTab === 'home' && activeView === 'ccr' && (
          <div className="space-y-3">
            <button
              onClick={() => setActiveView('home')}
              className="text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400 flex items-center gap-1"
            >
              &larr; Back to Home
            </button>
            <IOMHelpCleanClaimPage onNavigate={handleNavigate} />
          </div>
        )}
        {activeTab === 'payments'    && <IOMHelpPaymentsPage />}
        {activeTab === 'productions' && <IOMHelpProductionPage />}
        {activeTab === 'ar'          && <IOMHelpArPage />}
        {activeTab === 'insights'    && <IOMHelpInsightsPage />}
        {activeTab === 'procedure'   && <IOMHelpProcedurePage />}
        {activeTab === 'idr'         && <IOMHelpIDRPage />}
      </div>
    </div>
  );
}
