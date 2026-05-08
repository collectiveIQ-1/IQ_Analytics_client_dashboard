/**
 * NeuroWatchDashboard.jsx — Neuro Watch client dashboard container.
 * Tab navigation: Home | Payments | Productions | Accounts Receivable | Insights | Procedure
 */

import { useState, useRef, useMemo } from 'react';
import { Home, DollarSign, BarChart2, FileText, Lightbulb, Stethoscope } from 'lucide-react';
import NeuroWatchHomePage              from '../neurowatch/NeuroWatchHomePage';
import NeuroWatchPaymentsPage          from '../neurowatch/NeuroWatchPaymentsPage';
import NeuroWatchProductionPage        from '../neurowatch/NeuroWatchProductionPage';
import NeuroWatchAccountReceivablePage from '../neurowatch/NeuroWatchAccountReceivablePage';
import NeuroWatchInsightsPage          from '../neurowatch/NeuroWatchInsightsPage';
import NeuroWatchProcedurePage         from '../neurowatch/NeuroWatchProcedurePage';
import ExportMenu                      from '../../../components/dashboard/ExportMenu';

const TABS = [
  { id: 'home',        label: 'Home',                icon: Home        },
  { id: 'payments',    label: 'Payments',             icon: DollarSign  },
  { id: 'productions', label: 'Productions',          icon: BarChart2   },
  { id: 'ar',          label: 'Accounts Receivable',  icon: FileText    },
  { id: 'insights',    label: 'Insights',             icon: Lightbulb   },
  { id: 'procedure',   label: 'Procedure',            icon: Stethoscope },
];

export default function NeuroWatchDashboard({ clientId }) {
  const [activeTab, setActiveTab] = useState('home');
  const contentRef = useRef(null);

  const handleNavigate = (view) => {
    if (view === 'payments')    setActiveTab('payments');
    if (view === 'productions') setActiveTab('productions');
    if (view === 'ar')          setActiveTab('ar');
  };

  const handleTabClick = (tabId) => setActiveTab(tabId);

  const exportTitle = useMemo(() => {
    const tab = TABS.find(t => t.id === activeTab);
    return 'Neuro Watch — ' + (tab?.label ?? activeTab);
  }, [activeTab]);

  const exportFileName = useMemo(() => {
    return 'NeuroWatch-' + activeTab + '-' + new Date().toISOString().slice(0, 10);
  }, [activeTab]);

  const datasourceItems = useMemo(() => {
    const DS = {
      home: [
        { id: 'payment-history',     label: 'Payment History',          schema: 'iq_neurowatch', table: 'neurowatch_full_deposit', endpoint: '/neurowatch/datasource?chart=payment-history' },
        { id: 'charges-vs-payments', label: 'Charges vs Payments',      schema: 'iq_neurowatch', table: 'neurowatch_full_billing', endpoint: '/neurowatch/datasource?chart=charges-vs-payments' },
        { id: 'accounts-receivable', label: 'Accounts Receivable',      schema: 'iq_neurowatch', table: 'neurowatch_full_billing', endpoint: '/neurowatch/datasource?chart=accounts-receivable' },
        { id: 'total-charges',       label: 'Total Charges',            schema: 'iq_neurowatch', table: 'neurowatch_full_billing', endpoint: '/neurowatch/datasource?chart=total-charges' },
        { id: 'total-adjustments',   label: 'Total Adjustments',        schema: 'iq_neurowatch', table: 'neurowatch_full_billing', endpoint: '/neurowatch/datasource?chart=total-adjustments' },
        { id: 'ar-over-60',          label: 'AR % > 60+ Days',          schema: 'iq_neurowatch', table: 'neurowatch_full_billing', endpoint: '/neurowatch/datasource?chart=ar-over-60' },
      ],
      payments: [
        { id: 'payment-line',       label: 'Payment Trend',             schema: 'iq_neurowatch', table: 'neurowatch_full_deposit', endpoint: '/neurowatch/datasource?chart=payment-line' },
        { id: 'deposits-surgeon',   label: 'Deposits by Surgeon',       schema: 'iq_neurowatch', table: 'neurowatch_full_deposit', endpoint: '/neurowatch/datasource?chart=deposits-surgeon' },
        { id: 'deposits-hospital',  label: 'Deposits by Hospital',      schema: 'iq_neurowatch', table: 'neurowatch_full_deposit', endpoint: '/neurowatch/datasource?chart=deposits-hospital' },
        { id: 'deposits-billing',   label: 'Deposits by Billing Type',  schema: 'iq_neurowatch', table: 'neurowatch_full_deposit', endpoint: '/neurowatch/datasource?chart=deposits-billing' },
        { id: 'deposits-insurance', label: 'Deposits by Insurance',     schema: 'iq_neurowatch', table: 'neurowatch_full_deposit', endpoint: '/neurowatch/datasource?chart=deposits-insurance' },
      ],
      productions: [
        { id: 'prod-dos-chart',  label: 'DOS Charges vs Payments',       schema: 'iq_neurowatch', table: 'neurowatch_full_billing', endpoint: '/neurowatch/datasource?chart=prod-dos-chart' },
        { id: 'prod-doe-chart',  label: 'DOE Total Charges',             schema: 'iq_neurowatch', table: 'neurowatch_full_billing', endpoint: '/neurowatch/datasource?chart=prod-doe-chart' },
        { id: 'prod-dod-adj',    label: 'DOD Adjustment History',        schema: 'iq_neurowatch', table: 'neurowatch_full_billing', endpoint: '/neurowatch/datasource?chart=prod-dod-adj' },
        { id: 'prod-dod-pmt',    label: 'DOD Payment History',           schema: 'iq_neurowatch', table: 'neurowatch_full_deposit', endpoint: '/neurowatch/datasource?chart=prod-dod-pmt' },
        { id: 'prod-dod-payer',  label: 'DOD Payments by Payer',         schema: 'iq_neurowatch', table: 'neurowatch_full_deposit', endpoint: '/neurowatch/datasource?chart=prod-dod-payer' },
        { id: 'prod-dod-biller', label: 'DOD Payments by Biller Entity', schema: 'iq_neurowatch', table: 'neurowatch_full_deposit', endpoint: '/neurowatch/datasource?chart=prod-dod-biller' },
      ],
      ar: [
        { id: 'ar-dos',       label: 'AR Buckets (DOS)',  schema: 'iq_neurowatch', table: 'neurowatch_full_billing', endpoint: '/neurowatch/datasource?chart=ar-dos' },
        { id: 'ar-doe',       label: 'AR Buckets (DOE)',  schema: 'iq_neurowatch', table: 'neurowatch_full_billing', endpoint: '/neurowatch/datasource?chart=ar-doe' },
        { id: 'ar-insurance', label: 'AR by Insurance',   schema: 'iq_neurowatch', table: 'neurowatch_full_billing', endpoint: '/neurowatch/datasource?chart=ar-insurance' },
        { id: 'ar-surgeon',   label: 'AR by Surgeon',     schema: 'iq_neurowatch', table: 'neurowatch_full_billing', endpoint: '/neurowatch/datasource?chart=ar-surgeon' },
      ],
      insights: [
        { id: 'insights-insurance',  label: 'Insights by Insurance',  schema: 'iq_neurowatch', table: 'neurowatch_full_billing', endpoint: '/neurowatch/datasource?chart=insights-insurance' },
        { id: 'insights-surgeon',    label: 'Insights by Surgeon',    schema: 'iq_neurowatch', table: 'neurowatch_full_billing', endpoint: '/neurowatch/datasource?chart=insights-surgeon' },
        { id: 'insights-reader',     label: 'Insights by Reader',     schema: 'iq_neurowatch', table: 'neurowatch_full_billing', endpoint: '/neurowatch/datasource?chart=insights-reader' },
        { id: 'insights-technician', label: 'Insights by Technician', schema: 'iq_neurowatch', table: 'neurowatch_full_billing', endpoint: '/neurowatch/datasource?chart=insights-technician' },
      ],
      procedure: [
        { id: 'proc-deposits', label: 'Deposits by Procedure Type', schema: 'iq_neurowatch', table: 'neurowatch_full_deposit', endpoint: '/neurowatch/datasource?chart=proc-deposits' },
        { id: 'proc-charges',  label: 'Charges by Procedure Type',  schema: 'iq_neurowatch', table: 'neurowatch_full_billing', endpoint: '/neurowatch/datasource?chart=proc-charges' },
      ],
    };
    return DS[activeTab] ?? null;
  }, [activeTab]);

  return (
    <div className="-mt-2 min-w-0" ref={contentRef}>
      <div className="flex items-center justify-between gap-2">
        <div className="overflow-x-auto flex-1">
          <nav className="flex gap-0.5 border-b border-slate-100 dark:border-zinc-800 min-w-max">
            {TABS.map(({ id, label, icon: Icon }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => handleTabClick(id)}
                  className={[
                    'flex items-center gap-1.5 md:gap-2 px-2 md:px-4 py-2.5 md:py-3 text-xs md:text-sm font-semibold',
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
          <ExportMenu
            targetRef={contentRef}
            fileName={exportFileName}
            title={exportTitle}
            datasourceItems={datasourceItems}
          />
        </div>
      </div>

      <div className="pt-4">
        {activeTab === 'home'        && <NeuroWatchHomePage onNavigate={handleNavigate} />}
        {activeTab === 'payments'    && <NeuroWatchPaymentsPage />}
        {activeTab === 'productions' && <NeuroWatchProductionPage />}
        {activeTab === 'ar'          && <NeuroWatchAccountReceivablePage />}
        {activeTab === 'insights'    && <NeuroWatchInsightsPage />}
        {activeTab === 'procedure'   && <NeuroWatchProcedurePage />}
      </div>
    </div>
  );
}
