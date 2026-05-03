/**
 * SynapsesDashboard.jsx — Synapses client dashboard container.
 * Tab navigation: Home | Payments | Productions | Accounts Receivable | Insights | Procedure
 * Mirrors IOM Help structure. CCR card and chart are blank placeholders.
 */

import { useState, useRef, useMemo } from 'react';
import { Home, DollarSign, TrendingUp, CreditCard, FileText, BarChart2 } from 'lucide-react';
import SynapsesHomePage       from '../synapses/SynapsesHomePage';
import SynapsesPaymentsPage   from '../synapses/SynapsesPaymentsPage';
import SynapsesProductionPage from '../synapses/SynapsesProductionPage';
import SynapsesArPage         from '../synapses/SynapsesArPage';
import SynapsesProcedurePage  from '../synapses/SynapsesProcedurePage';
import SynapsesInsightsPage   from '../synapses/SynapsesInsightsPage';
import ExportMenu             from '../../../components/dashboard/ExportMenu';

const TABS = [
  { id: 'home',        label: 'Home',                icon: Home },
  { id: 'payments',    label: 'Payments',             icon: DollarSign },
  { id: 'productions', label: 'Productions',          icon: TrendingUp },
  { id: 'ar',          label: 'Accounts Receivable',  icon: CreditCard },
  { id: 'insights',    label: 'Insights',             icon: BarChart2 },
  { id: 'procedure',   label: 'Procedure',            icon: FileText },
];

export default function SynapsesDashboard({ clientId }) {
  const [activeTab,  setActiveTab]  = useState('home');
  const [activeView, setActiveView] = useState('home');
  const contentRef = useRef(null);

  const handleNavigate = (view) => {
    if (view === 'payments') { setActiveTab('payments'); setActiveView('home'); }
  };

  const handleTabClick = (tabId) => { setActiveTab(tabId); setActiveView('home'); };

  const exportTitle = useMemo(() => {
    const tab = TABS.find((t) => t.id === activeTab);
    return 'Synapses - ' + (tab?.label ?? activeTab);
  }, [activeTab]);

  const exportFileName = useMemo(() => {
    return 'Synapses-' + activeTab + '-' + new Date().toISOString().slice(0, 10);
  }, [activeTab]);

  const datasourceItems = useMemo(() => {
    const DS = {
      home: [
        { id: 'payment-history',     label: 'Payment History',         table: 'synapses_full_deposit',  endpoint: '/synapses/datasource?chart=payment-history' },
        { id: 'charges-vs-payments', label: 'Charges vs Payments',     table: 'synapses_full_billing',  endpoint: '/synapses/datasource?chart=charges-vs-payments' },
        { id: 'accounts-receivable', label: 'Accounts Receivable',     table: 'synapses_full_billing',  endpoint: '/synapses/datasource?chart=accounts-receivable' },
      ],
      payments: [
        { id: 'payment-history',    label: 'Payment History',          table: 'synapses_full_deposit', endpoint: '/synapses/datasource?chart=payment-history' },
        { id: 'payment-line',       label: 'Payment Trend',            table: 'synapses_full_deposit', endpoint: '/synapses/datasource?chart=payment-line' },
        { id: 'deposits-surgeon',   label: 'Deposits by Surgeon',      table: 'synapses_full_deposit', endpoint: '/synapses/datasource?chart=deposits-surgeon' },
        { id: 'deposits-hospital',  label: 'Deposits by Hospital',     table: 'synapses_full_deposit', endpoint: '/synapses/datasource?chart=deposits-hospital' },
        { id: 'deposits-billing',   label: 'Deposits by Billing Type', table: 'synapses_full_deposit', endpoint: '/synapses/datasource?chart=deposits-billing' },
        { id: 'deposits-insurance', label: 'Deposits by Insurance',    table: 'synapses_full_deposit', endpoint: '/synapses/datasource?chart=deposits-insurance' },
      ],
      productions: [
        { id: 'production-dos', label: 'Production — DOS', table: 'synapses_full_billing', endpoint: '/synapses/datasource?chart=production-dos' },
        { id: 'production-doe', label: 'Production — DOE', table: 'synapses_full_billing', endpoint: '/synapses/datasource?chart=production-doe' },
      ],
      ar: [
        { id: 'ar-dos',       label: 'AR — Date of Service', table: 'synapses_full_billing', endpoint: '/synapses/datasource?chart=ar-dos' },
        { id: 'ar-doe',       label: 'AR — Date of Entry',   table: 'synapses_full_billing', endpoint: '/synapses/datasource?chart=ar-doe' },
        { id: 'ar-insurance', label: 'AR by Insurance',      table: 'synapses_full_billing', endpoint: '/synapses/datasource?chart=ar-insurance' },
        { id: 'ar-surgeon',   label: 'AR by Surgeon',        table: 'synapses_full_billing', endpoint: '/synapses/datasource?chart=ar-surgeon' },
      ],
      insights: [
        { id: 'insight-insurance',  label: 'Insights by Insurance',   table: 'synapses_full_billing', endpoint: '/synapses/datasource?chart=insight-insurance' },
        { id: 'insight-surgeon',    label: 'Insights by Surgeon',     table: 'synapses_full_billing', endpoint: '/synapses/datasource?chart=insight-surgeon' },
        { id: 'insight-reader',     label: 'Insights by Reader',      table: 'synapses_full_billing', endpoint: '/synapses/datasource?chart=insight-reader' },
        { id: 'insight-technician', label: 'Insights by Technician',  table: 'synapses_full_billing', endpoint: '/synapses/datasource?chart=insight-technician' },
      ],
      procedure: [
        { id: 'procedure-deposits', label: 'Procedure Deposits', table: 'synapses_full_deposit', endpoint: '/synapses/datasource?chart=procedure-deposits' },
        { id: 'procedure-charges',  label: 'Procedure Charges',  table: 'synapses_full_billing', endpoint: '/synapses/datasource?chart=procedure-charges' },
        { id: 'procedure-more',     label: 'Procedure Detail',   table: 'synapses_full_billing', endpoint: '/synapses/datasource?chart=procedure-more' },
      ],

    };
    return DS[activeTab] ?? null;
  }, [activeTab]);

  return (
    <div className="-mt-2" ref={contentRef}>
      <div className="flex items-end justify-between gap-2">
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
        {activeTab === 'home' && (
          <SynapsesHomePage onNavigate={handleNavigate} />
        )}
        {activeTab === 'payments'    && <SynapsesPaymentsPage />}
        {activeTab === 'productions' && <SynapsesProductionPage />}
        {activeTab === 'ar'          && <SynapsesArPage />}
        {activeTab === 'insights'    && <SynapsesInsightsPage />}
        {activeTab === 'procedure'   && <SynapsesProcedurePage />}
      </div>
    </div>
  );
}
