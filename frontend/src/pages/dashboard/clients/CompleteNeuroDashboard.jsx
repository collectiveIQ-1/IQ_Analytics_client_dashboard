/**
 * CompleteNeuroDashboard.jsx -- Complete Neuro client dashboard container.
 * Tab navigation: Home | Payments | Productions | Accounts Receivable | Insights | Procedure
 */

import { useState, useRef, useMemo } from 'react';
import { Home, DollarSign, TrendingUp, FileBarChart, Lightbulb, FileText } from 'lucide-react';
import CompleteNeuroHomePage       from '../completeneuro/CompleteNeuroHomePage';
import CompleteNeuroPaymentsPage   from '../completeneuro/CompleteNeuroPaymentsPage';
import CompleteNeuroProductionPage from '../completeneuro/CompleteNeuroProductionPage';
import CompleteNeuroARPage         from '../completeneuro/CompleteNeuroARPage';
import CompleteNeuroInsightsPage   from '../completeneuro/CompleteNeuroInsightsPage';
import CompleteNeuroProcedurePage  from '../completeneuro/CompleteNeuroProcedurePage';
import PlaceholderDashboard        from '../../../components/dashboard/PlaceholderDashboard';
import ExportMenu                  from '../../../components/dashboard/ExportMenu';

const TABS = [
  { id: 'home',                label: 'Home',                icon: Home },
  { id: 'payments',            label: 'Payments',            icon: DollarSign },
  { id: 'productions',         label: 'Productions',         icon: TrendingUp },
  { id: 'accounts-receivable', label: 'Accounts Receivable', icon: FileBarChart },
  { id: 'insights',            label: 'Insights',            icon: Lightbulb },
  { id: 'procedure',           label: 'Procedure',           icon: FileText },
];

export default function CompleteNeuroDashboard({ clientId }) {
  const [activeTab,  setActiveTab]  = useState('home');
  const [activeView, setActiveView] = useState('home');
  const contentRef = useRef(null);

  const handleNavigate = (view) => {
    if (view === 'ccr')      { setActiveView('ccr');     setActiveTab('home'); }
    if (view === 'payments') { setActiveTab('payments'); setActiveView('home'); }
  };

  const handleTabClick = (tabId) => { setActiveTab(tabId); setActiveView('home'); };

  const exportTitle = useMemo(() => {
    if (activeTab === 'home' && activeView === 'ccr') return 'Complete Neuro - Clean Claim Rate';
    const tab = TABS.find((t) => t.id === activeTab);
    return 'Complete Neuro - ' + (tab?.label ?? activeTab);
  }, [activeTab, activeView]);

  const exportFileName = useMemo(() => {
    const base = activeTab === 'home' && activeView === 'ccr'
      ? 'CompleteNeuro-CleanClaimRate'
      : 'CompleteNeuro-' + activeTab;
    return base + '-' + new Date().toISOString().slice(0, 10);
  }, [activeTab, activeView]);

  const datasourceItems = useMemo(() => {
    const ep = (chartId) => `/completeneuro/datasource?chart=${chartId}`;
    const DS = {
      home: [
        { id: 'payment-history',     label: 'Payment History',            schema: 'iq_completeneuro', table: 'completeneuro_full_deposit', endpoint: ep('payment-history')     },
        { id: 'charges-vs-payments', label: 'Charges vs Payments',        schema: 'iq_completeneuro', table: 'completeneuro_full_billing', endpoint: ep('charges-vs-payments') },
        { id: 'ccr-history',         label: 'CCR History',                schema: 'iq_completeneuro', table: 'ccr_history',                endpoint: ep('ccr-history')         },
        { id: 'accounts-receivable', label: 'Accounts Receivable',        schema: 'iq_completeneuro', table: 'completeneuro_full_billing', endpoint: ep('accounts-receivable') },
        { id: 'total-charges',       label: 'Total Charges',              schema: 'iq_completeneuro', table: 'completeneuro_full_billing', endpoint: ep('total-charges')       },
        { id: 'adjustments',         label: 'Total Adjustments',          schema: 'iq_completeneuro', table: 'completeneuro_full_billing', endpoint: ep('adjustments')         },
        { id: 'ar-donut',            label: 'AR % >60 Days',              schema: 'iq_completeneuro', table: 'completeneuro_full_billing', endpoint: ep('ar-donut')            },
      ],
      payments: [
        { id: 'payment-line',        label: 'All Time Payment History',   schema: 'iq_completeneuro', table: 'completeneuro_full_deposit', endpoint: ep('payment-line')        },
        { id: 'deposits-surgeon',    label: 'Deposits by Surgeon',        schema: 'iq_completeneuro', table: 'completeneuro_full_deposit', endpoint: ep('deposits-surgeon')    },
        { id: 'deposits-hospital',   label: 'Deposits by Hospital',       schema: 'iq_completeneuro', table: 'completeneuro_full_deposit', endpoint: ep('deposits-hospital')   },
        { id: 'deposits-billing',    label: 'Deposits by Billing Type',   schema: 'iq_completeneuro', table: 'completeneuro_full_deposit', endpoint: ep('deposits-billing')    },
        { id: 'deposits-insurance',  label: 'Deposits by Insurance Type', schema: 'iq_completeneuro', table: 'completeneuro_full_deposit', endpoint: ep('deposits-insurance')  },
      ],
      productions: [
        { id: 'cn-prod-billing',     label: 'Production Billing Data',    schema: 'iq_completeneuro', table: 'completeneuro_full_billing', endpoint: ep('cn-prod-billing')     },
        { id: 'cn-prod-deposit',     label: 'Production Deposit Data',    schema: 'iq_completeneuro', table: 'completeneuro_full_deposit', endpoint: ep('cn-prod-deposit')     },
      ],
      'accounts-receivable': [
        { id: 'cn-ar-billing',       label: 'AR Billing Data',            schema: 'iq_completeneuro', table: 'completeneuro_full_billing', endpoint: ep('cn-ar-billing')       },
      ],
      insights: [
        { id: 'cn-insights-billing', label: 'Insights Billing Data',      schema: 'iq_completeneuro', table: 'completeneuro_full_billing', endpoint: ep('cn-insights-billing') },
      ],
      procedure: [
        { id: 'cn-prod-deposit',     label: 'Procedure Deposit Data',     schema: 'iq_completeneuro', table: 'completeneuro_full_deposit', endpoint: ep('cn-prod-deposit')     },
        { id: 'cn-prod-billing',     label: 'Procedure Billing Data',     schema: 'iq_completeneuro', table: 'completeneuro_full_billing', endpoint: ep('cn-prod-billing')     },
      ],
    };
    return DS[activeTab] ?? null;
  }, [activeTab]);

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
          <CompleteNeuroHomePage onNavigate={handleNavigate} />
        )}
        {activeTab === 'home' && activeView === 'ccr' && (
          <div className="space-y-3">
            <button
              onClick={() => setActiveView('home')}
              className="text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400 flex items-center gap-1"
            >
              &larr; Back to Home
            </button>
            <PlaceholderDashboard clientName="Complete Neuro Clean Claim Rate" />
          </div>
        )}
        {activeTab === 'payments'            && <CompleteNeuroPaymentsPage />}
        {activeTab === 'productions'         && <CompleteNeuroProductionPage />}
        {activeTab === 'accounts-receivable' && <CompleteNeuroARPage />}
        {activeTab === 'insights'            && <CompleteNeuroInsightsPage />}
        {activeTab === 'procedure'           && <CompleteNeuroProcedurePage />}
      </div>
    </div>
  );
}
