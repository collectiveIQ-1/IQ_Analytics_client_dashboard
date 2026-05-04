/**
 * USNeuroDashboard.jsx — US Neuro client dashboard container.
 * Tab navigation: Home | Payments | Productions | Insights | Accounts Receivable
 */

import { useState, useRef, useMemo } from 'react';
import { Home, DollarSign, BarChart2, TrendingUp, CreditCard, Lightbulb } from 'lucide-react';
import USNeuroHomePage              from '../usneuro/USNeuroHomePage';
import USNeuroCleanClaimPage        from '../usneuro/USNeuroCleanClaimPage';
import USNeuroPaymentsPage          from '../usneuro/USNeuroPaymentsPage';
import USNeuroProductionPage        from '../usneuro/USNeuroProductionPage';
import USNeuroInsightsPage          from '../usneuro/USNeuroInsightsPage';
import USNeuroAccountReceivablePage from '../usneuro/USNeuroAccountReceivablePage';
import ExportMenu                   from '../../../components/dashboard/ExportMenu';

const TABS = [
  { id: 'home',        label: 'Home',                icon: Home },
  { id: 'payments',    label: 'Payments',            icon: DollarSign },
  { id: 'productions', label: 'Productions',         icon: TrendingUp },
  { id: 'insights',    label: 'Insights',            icon: Lightbulb },
  { id: 'ar',          label: 'Accounts Receivable', icon: CreditCard },
];

function ComingSoon({ label }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-3">
        <BarChart2 size={20} className="text-red-500" />
      </div>
      <h3 className="text-base font-semibold text-slate-700 dark:text-zinc-200 mb-1">{label}</h3>
      <p className="text-sm text-slate-400 dark:text-zinc-500">This section is under development.</p>
    </div>
  );
}

export default function USNeuroDashboard({ clientId }) {
  const [activeTab,  setActiveTab]  = useState('home');
  const [activeView, setActiveView] = useState('home');
  const contentRef = useRef(null);

  const handleNavigate = (view) => {
    if (view === 'ccr')      { setActiveView('ccr');      setActiveTab('home'); }
    if (view === 'payments') { setActiveTab('payments'); setActiveView('home'); }
  };

  const handleTabClick = (tabId) => { setActiveTab(tabId); setActiveView('home'); };

  const exportTitle = useMemo(() => {
    if (activeTab === 'home' && activeView === 'ccr') return 'USNeuro — Clean Claim Rate';
    const tab = TABS.find((t) => t.id === activeTab);
    return 'USNeuro — ' + (tab?.label ?? activeTab);
  }, [activeTab, activeView]);

  const exportFileName = useMemo(() => {
    const base = activeTab === 'home' && activeView === 'ccr' ? 'USNeuro-CleanClaimRate' : 'USNeuro-' + activeTab;
    return base + '-' + new Date().toISOString().slice(0, 10);
  }, [activeTab, activeView]);

  // Data Source items — SELECT * from full source table per chart.
  // Each id must match a key in backend USNEURO_DS_MAP (usneuro.controller.js).
  const datasourceItems = useMemo(() => {
    // CCR drill-down sub-view
    if (activeTab === 'home' && activeView === 'ccr') {
      return [
        { id: 'ccr-denial-reasons', label: 'Top Denial Reasons',      schema: 'iq_usneuro', table: 'usneuro_ccr',        endpoint: '/usneuro/datasource?chart=ccr-denial-reasons' },
        { id: 'ccr-detail-history', label: 'Clean Claim Rate History', schema: 'iq_usneuro', table: 'usneuro_ccrhistory', endpoint: '/usneuro/datasource?chart=ccr-detail-history' },
      ];
    }

    const DS = {
      // ── Home ──────────────────────────────────────────────────────────────
      home: [
        { id: 'home-total-payments',    label: 'Total Payments',          schema: 'iq_usneuro', table: 'usneuro_full_deposit', endpoint: '/usneuro/datasource?chart=home-total-payments' },
        { id: 'home-total-charges',     label: 'Total Charges',           schema: 'iq_usneuro', table: 'usneuro_full_billing', endpoint: '/usneuro/datasource?chart=home-total-charges' },
        { id: 'home-avg-days',          label: 'AVG Days DOS to DOE',     schema: 'iq_usneuro', table: 'usneuro_full_billing', endpoint: '/usneuro/datasource?chart=home-avg-days' },
        { id: 'home-ccr',               label: 'Clean Claim Rate',        schema: 'iq_usneuro', table: 'usneuro_ccr',          endpoint: '/usneuro/datasource?chart=home-ccr' },
        { id: 'payment-history',        label: 'Payment History',         schema: 'iq_usneuro', table: 'usneuro_full_deposit', endpoint: '/usneuro/datasource?chart=payment-history' },
        { id: 'charges-vs-payments',    label: 'Charges vs Payments',     schema: 'iq_usneuro', table: 'usneuro_full_billing', endpoint: '/usneuro/datasource?chart=charges-vs-payments' },
        { id: 'ccr-history',            label: 'CCR History',             schema: 'iq_usneuro', table: 'usneuro_ccrhistory',   endpoint: '/usneuro/datasource?chart=ccr-history' },
        { id: 'ar-buckets',             label: 'Accounts Receivable',     schema: 'iq_usneuro', table: 'usneuro_full_billing', endpoint: '/usneuro/datasource?chart=ar-buckets' },
        { id: 'home-total-adjustments', label: 'Total Adjustments',       schema: 'iq_usneuro', table: 'usneuro_full_billing', endpoint: '/usneuro/datasource?chart=home-total-adjustments' },
        { id: 'home-ar-over-60',        label: 'AR % > 60+ Days',         schema: 'iq_usneuro', table: 'usneuro_full_billing', endpoint: '/usneuro/datasource?chart=home-ar-over-60' },
      ],
      // ── Payments ──────────────────────────────────────────────────────────
      payments: [
        { id: 'payment-history',    label: 'Payment History',          schema: 'iq_usneuro', table: 'usneuro_full_deposit', endpoint: '/usneuro/datasource?chart=payment-history' },
        { id: 'payment-line',       label: 'Payment Trend',            schema: 'iq_usneuro', table: 'usneuro_full_deposit', endpoint: '/usneuro/datasource?chart=payment-line' },
        { id: 'deposits-surgeon',   label: 'Deposits by Surgeon',      schema: 'iq_usneuro', table: 'usneuro_full_deposit', endpoint: '/usneuro/datasource?chart=deposits-surgeon' },
        { id: 'deposits-hospital',  label: 'Deposits by Hospital',     schema: 'iq_usneuro', table: 'usneuro_full_deposit', endpoint: '/usneuro/datasource?chart=deposits-hospital' },
        { id: 'deposits-billing',   label: 'Deposits by Billing Type', schema: 'iq_usneuro', table: 'usneuro_full_deposit', endpoint: '/usneuro/datasource?chart=deposits-billing' },
        { id: 'deposits-insurance', label: 'Deposits by Insurance',    schema: 'iq_usneuro', table: 'usneuro_full_deposit', endpoint: '/usneuro/datasource?chart=deposits-insurance' },
      ],
      // ── Productions ───────────────────────────────────────────────────────
      productions: [
        { id: 'production-doe',       label: 'DOE Charges',                   schema: 'iq_usneuro', table: 'usneuro_full_billing', endpoint: '/usneuro/datasource?chart=production-doe' },
        { id: 'production-dos',       label: 'DOS Charges vs Payments',       schema: 'iq_usneuro', table: 'usneuro_full_billing', endpoint: '/usneuro/datasource?chart=production-dos' },
        { id: 'prod-dod-adjustments', label: 'DOD Adjustments',               schema: 'iq_usneuro', table: 'usneuro_full_deposit', endpoint: '/usneuro/datasource?chart=prod-dod-adjustments' },
        { id: 'prod-dod-payments',    label: 'DOD Payments History',          schema: 'iq_usneuro', table: 'usneuro_full_deposit', endpoint: '/usneuro/datasource?chart=prod-dod-payments' },
        { id: 'prod-dod-payer',       label: 'DOD Payments by Payer',         schema: 'iq_usneuro', table: 'usneuro_full_deposit', endpoint: '/usneuro/datasource?chart=prod-dod-payer' },
        { id: 'prod-dod-biller',      label: 'DOD Payments by Biller Entity', schema: 'iq_usneuro', table: 'usneuro_full_deposit', endpoint: '/usneuro/datasource?chart=prod-dod-biller' },
        { id: 'prod-reimb-doe',       label: 'Reimbursement Analysis — DOE',  schema: 'iq_usneuro', table: 'usneuro_full_billing', endpoint: '/usneuro/datasource?chart=prod-reimb-doe' },
        { id: 'prod-reimb-dos',       label: 'Reimbursement Analysis — DOS',  schema: 'iq_usneuro', table: 'usneuro_full_billing', endpoint: '/usneuro/datasource?chart=prod-reimb-dos' },
      ],
      // ── Accounts Receivable ───────────────────────────────────────────────
      ar: [
        { id: 'ar-dos',      label: 'AR — Date of Service', schema: 'iq_usneuro', table: 'usneuro_full_billing', endpoint: '/usneuro/datasource?chart=ar-dos' },
        { id: 'ar-doe',      label: 'AR — Date of Entry',   schema: 'iq_usneuro', table: 'usneuro_full_billing', endpoint: '/usneuro/datasource?chart=ar-doe' },
        { id: 'ar-treemap',  label: 'AR by Carrier',        schema: 'iq_usneuro', table: 'usneuro_full_billing', endpoint: '/usneuro/datasource?chart=ar-treemap' },
        { id: 'ar-insurance',label: 'AR by Insurance',      schema: 'iq_usneuro', table: 'usneuro_full_billing', endpoint: '/usneuro/datasource?chart=ar-insurance' },
        { id: 'ar-surgeon',  label: 'AR by Surgeon',        schema: 'iq_usneuro', table: 'usneuro_full_billing', endpoint: '/usneuro/datasource?chart=ar-surgeon' },
        { id: 'ar-expanded', label: 'AR Expanded View',     schema: 'iq_usneuro', table: 'usneuro_full_billing', endpoint: '/usneuro/datasource?chart=ar-expanded' },
      ],
      // ── Insights ──────────────────────────────────────────────────────────
      insights: [
        { id: 'insight-insurance', label: 'Insurance Wise Analysis', schema: 'iq_usneuro', table: 'usneuro_full_billing', endpoint: '/usneuro/datasource?chart=insight-insurance' },
        { id: 'insight-surgeon',   label: 'Surgeon Wise Analysis',   schema: 'iq_usneuro', table: 'usneuro_full_billing', endpoint: '/usneuro/datasource?chart=insight-surgeon' },
      ],
    };
    return DS[activeTab] ?? null;
  }, [activeTab, activeView]);

  return (
    <div className="-mt-2" ref={contentRef}>
      {/* Tab bar + Export */}
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

      {/* Tab content */}
      <div className="pt-4">
        {activeTab === 'home' && activeView === 'home' && (
          <USNeuroHomePage onNavigate={handleNavigate} />
        )}
        {activeTab === 'home' && activeView === 'ccr' && (
          <div className="space-y-3">
            <button
              onClick={() => setActiveView('home')}
              className="text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400 flex items-center gap-1"
            >
              ← Back to Home
            </button>
            <USNeuroCleanClaimPage onNavigate={handleNavigate} />
          </div>
        )}
        {activeTab === 'payments'    && <USNeuroPaymentsPage />}
        {activeTab === 'productions' && <USNeuroProductionPage />}
        {activeTab === 'insights'    && <USNeuroInsightsPage />}
        {activeTab === 'ar'          && <USNeuroAccountReceivablePage />}
      </div>
    </div>
  );
}
