/**
 * QFDDashboard.jsx — QFD dashboard container.
 * Tab navigation: Home | Payments | Production | Facilities | AR | Insight | Panel | TAT | Clinical
 */

import { useState, useRef, useMemo } from 'react';
import {
  Home, DollarSign, Activity, Building2, CreditCard,
  Lightbulb, BarChart2, Clock, Brain,
} from 'lucide-react';
import QFDHomePage             from '../qfd/QFDHomePage';
import QFDCleanClaimPage       from '../qfd/QFDCleanClaimPage';
import QFDPaymentsPage         from '../qfd/QFDPaymentsPage';
import QFDProductionPage       from '../qfd/QFDProductionPage';
import QFDAccountReceivablePage from '../qfd/QFDAccountReceivablePage';
import QFDTurnAroundTimePage   from '../qfd/QFDTurnAroundTimePage';
import QFDFacilityPage         from '../qfd/QFDFacilityPage';
import QFDInsightPage          from '../qfd/QFDInsightPage';
import QFDPanelAnalysisPage    from '../qfd/QFDPanelAnalysisPage';
import QFDClinicalAnalysisPage from '../qfd/QFDClinicalAnalysisPage';
import ExportMenu              from '../../../components/dashboard/ExportMenu';

const TABS = [
  { id: 'home',       label: 'Home',              icon: Home },
  { id: 'payments',   label: 'Payments',           icon: DollarSign },
  { id: 'production', label: 'Production',         icon: Activity },
  { id: 'facilities', label: 'Facilities',         icon: Building2 },
  { id: 'ar',         label: 'Account Receivable', icon: CreditCard },
  { id: 'insight',    label: 'Insight',            icon: Lightbulb },
  { id: 'panel',      label: 'Panel Analysis',     icon: BarChart2 },
  { id: 'tat',        label: 'Turnaround Time',    icon: Clock },
  { id: 'clinical',   label: 'Clinical Analysis',  icon: Brain },
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

export default function QFDDashboard({ clientId }) {
  const [activeTab,  setActiveTab]  = useState('home');
  const [activeView, setActiveView] = useState('home');
  const contentRef = useRef(null);

  const handleNavigate = (view) => {
    if (view === 'ccr')     { setActiveView('ccr');      setActiveTab('home'); }
    if (view === 'payments') { setActiveTab('payments'); setActiveView('home'); }
    if (view === 'ar')       { setActiveTab('ar');       setActiveView('home'); }
  };

  const handleTabClick = (tabId) => { setActiveTab(tabId); setActiveView('home'); };

  const exportTitle = useMemo(() => {
    if (activeTab === 'home' && activeView === 'ccr') return 'QFD — Clean Claim Rate';
    const tab = TABS.find((t) => t.id === activeTab);
    return 'QFD — ' + (tab?.label ?? activeTab);
  }, [activeTab, activeView]);

  const exportFileName = useMemo(() => {
    const base = activeTab === 'home' && activeView === 'ccr' ? 'QFD-CleanClaimRate' : 'QFD-' + activeTab;
    return base + '-' + new Date().toISOString().slice(0, 10);
  }, [activeTab, activeView]);

  // Data Source items — SELECT * from full source table per chart.
  // Each id must match a key in backend CHART_DS_MAP (qfd.controller.js).
  // schema field is included so ExportMenu can show it in the Export_Info sheet.
  const datasourceItems = useMemo(() => {
    // CCR drill-down sub-view
    if (activeTab === 'home' && activeView === 'ccr') {
      return [
        { id: 'ccr-claims',         label: 'Clean Claim Rate — Claims', schema: 'iq_qfd', table: 'ccr',         endpoint: '/qfd/datasource?chart=ccr-claims' },
        { id: 'ccr-detail-history', label: 'CCR History',               schema: 'iq_qfd', table: 'ccr_history', endpoint: '/qfd/datasource?chart=ccr-detail-history' },
        { id: 'ccr-denial-reasons', label: 'Denial Reasons',            schema: 'iq_qfd', table: 'ccr',         endpoint: '/qfd/datasource?chart=ccr-denial-reasons' },
      ];
    }

    const DS = {
      // ── Home ──────────────────────────────────────────────────────────────
      home: [
        { id: 'payment-history-dod', label: 'Payment History (DOD)',     schema: 'iq_qfd', table: 'deposit_report', endpoint: '/qfd/datasource?chart=payment-history-dod' },
        { id: 'charges-vs-payments', label: 'Charges vs Payments (DOE)', schema: 'iq_qfd', table: 'doe',            endpoint: '/qfd/datasource?chart=charges-vs-payments' },
        { id: 'ccr-history',         label: 'CCR History',               schema: 'iq_qfd', table: 'ccr_history',    endpoint: '/qfd/datasource?chart=ccr-history' },
        { id: 'accounts-receivable', label: 'Accounts Receivable',       schema: 'iq_qfd', table: 'full_ar',        endpoint: '/qfd/datasource?chart=accounts-receivable' },
        { id: 'total-charges',       label: 'Total Charges (DOE)',       schema: 'iq_qfd', table: 'doe',            endpoint: '/qfd/datasource?chart=total-charges' },
        { id: 'total-adjustments',   label: 'Total Adjustments',         schema: 'iq_qfd', table: 'adj_report',     endpoint: '/qfd/datasource?chart=total-adjustments' },
        { id: 'ar-over-60',          label: 'AR % > 60+ Days',           schema: 'iq_qfd', table: 'full_ar',        endpoint: '/qfd/datasource?chart=ar-over-60' },
      ],
      // ── Payments ──────────────────────────────────────────────────────────
      payments: [
        { id: 'payment-history-dod',  label: 'Payment History (DOD)',          schema: 'iq_qfd', table: 'deposit_report',     endpoint: '/qfd/datasource?chart=payment-history-dod' },
        { id: 'payment-history-full', label: 'All Time Payment History',       schema: 'iq_qfd', table: 'full_deposit_report', endpoint: '/qfd/datasource?chart=payment-history-full' },
        { id: 'bank-deposit-history', label: 'Bank Deposits',                  schema: 'iq_qfd', table: 'bank',                endpoint: '/qfd/datasource?chart=bank-deposit-history' },
        { id: 'pay-deposits-provider',label: 'Deposits by Referring Provider', schema: 'iq_qfd', table: 'deposit_report',     endpoint: '/qfd/datasource?chart=pay-deposits-provider' },
        { id: 'pay-deposits-facility',label: 'Deposits by Facility',           schema: 'iq_qfd', table: 'deposit_report',     endpoint: '/qfd/datasource?chart=pay-deposits-facility' },
        { id: 'adjustments-full',     label: 'All Time Adjustments',           schema: 'iq_qfd', table: 'adj_report',          endpoint: '/qfd/datasource?chart=adjustments-full' },
      ],
      // ── Production ────────────────────────────────────────────────────────
      production: [
        { id: 'production-dos',           label: 'Production — DOS',                schema: 'iq_qfd', table: 'dos',            endpoint: '/qfd/datasource?chart=production-dos' },
        { id: 'production-doe',           label: 'Production — DOE',                schema: 'iq_qfd', table: 'doe',            endpoint: '/qfd/datasource?chart=production-doe' },
        { id: 'production-dod-adj',       label: 'DOD Adjustment History',          schema: 'iq_qfd', table: 'adj_report',     endpoint: '/qfd/datasource?chart=production-dod-adj' },
        { id: 'production-dod-deposit',   label: 'DOD Payment History',             schema: 'iq_qfd', table: 'deposit_report', endpoint: '/qfd/datasource?chart=production-dod-deposit' },
        { id: 'production-dod-method',    label: 'DOD Payment Method',              schema: 'iq_qfd', table: 'deposit_report', endpoint: '/qfd/datasource?chart=production-dod-method' },
        { id: 'production-reimb-dos',     label: 'Reimbursement Analysis — DOS',    schema: 'iq_qfd', table: 'dos',            endpoint: '/qfd/datasource?chart=production-reimb-dos' },
        { id: 'production-reimb-doe',     label: 'Reimbursement Analysis — DOE',    schema: 'iq_qfd', table: 'doe',            endpoint: '/qfd/datasource?chart=production-reimb-doe' },
        { id: 'production-reimb-dod-doe', label: 'Reimbursement DOD — DOE Data',    schema: 'iq_qfd', table: 'doe',            endpoint: '/qfd/datasource?chart=production-reimb-dod-doe' },
        { id: 'production-reimb-dod-dep', label: 'Reimbursement DOD — Payments',    schema: 'iq_qfd', table: 'deposit_report', endpoint: '/qfd/datasource?chart=production-reimb-dod-dep' },
        { id: 'production-reimb-dod-adj', label: 'Reimbursement DOD — Adjustments', schema: 'iq_qfd', table: 'adj_report',     endpoint: '/qfd/datasource?chart=production-reimb-dod-adj' },
      ],
      // ── Facilities ────────────────────────────────────────────────────────
      facilities: [
        { id: 'facility-dos',         label: 'Facility Analysis — DOS',    schema: 'iq_qfd', table: 'dos',            endpoint: '/qfd/datasource?chart=facility-dos' },
        { id: 'facility-doe',         label: 'Facility Analysis — DOE',    schema: 'iq_qfd', table: 'doe',            endpoint: '/qfd/datasource?chart=facility-doe' },
        { id: 'facility-dod-doe',     label: 'Facility DOD — DOE Data',    schema: 'iq_qfd', table: 'doe',            endpoint: '/qfd/datasource?chart=facility-dod-doe' },
        { id: 'facility-dod-deposit', label: 'Facility DOD — Payments',    schema: 'iq_qfd', table: 'deposit_report', endpoint: '/qfd/datasource?chart=facility-dod-deposit' },
        { id: 'facility-dod-adj',     label: 'Facility DOD — Adjustments', schema: 'iq_qfd', table: 'adj_report',     endpoint: '/qfd/datasource?chart=facility-dod-adj' },
      ],
      // ── Accounts Receivable ───────────────────────────────────────────────
      ar: [
        { id: 'ar-dos',         label: 'AR — Date of Service',      schema: 'iq_qfd', table: 'full_ar', endpoint: '/qfd/datasource?chart=ar-dos' },
        { id: 'ar-doe',         label: 'AR — Date of Entry',        schema: 'iq_qfd', table: 'full_ar', endpoint: '/qfd/datasource?chart=ar-doe' },
        { id: 'ar-by-carrier',  label: 'AR by Carrier',             schema: 'iq_qfd', table: 'full_ar', endpoint: '/qfd/datasource?chart=ar-by-carrier' },
        { id: 'ar-by-financial',label: 'AR by Financial Category',  schema: 'iq_qfd', table: 'full_ar', endpoint: '/qfd/datasource?chart=ar-by-financial' },
      ],
      // ── Insight ───────────────────────────────────────────────────────────
      insight: [
        { id: 'insight-provider-dos',     label: 'Provider Analysis — DOS',             schema: 'iq_qfd', table: 'dos',            endpoint: '/qfd/datasource?chart=insight-provider-dos' },
        { id: 'insight-provider-doe',     label: 'Provider Analysis — DOE',             schema: 'iq_qfd', table: 'doe',            endpoint: '/qfd/datasource?chart=insight-provider-doe' },
        { id: 'insight-provider-dod-doe', label: 'Provider DOD — DOE Data',             schema: 'iq_qfd', table: 'doe',            endpoint: '/qfd/datasource?chart=insight-provider-dod-doe' },
        { id: 'insight-provider-dod-dep', label: 'Provider DOD — Payments',             schema: 'iq_qfd', table: 'deposit_report', endpoint: '/qfd/datasource?chart=insight-provider-dod-dep' },
        { id: 'insight-provider-dod-adj', label: 'Provider DOD — Adjustments',          schema: 'iq_qfd', table: 'adj_report',     endpoint: '/qfd/datasource?chart=insight-provider-dod-adj' },
        { id: 'insight-payer-dos',        label: 'Payer Analysis — DOS',                schema: 'iq_qfd', table: 'dos',            endpoint: '/qfd/datasource?chart=insight-payer-dos' },
        { id: 'insight-payer-doe',        label: 'Payer Analysis — DOE',                schema: 'iq_qfd', table: 'doe',            endpoint: '/qfd/datasource?chart=insight-payer-doe' },
        { id: 'insight-payer-dod-doe',    label: 'Payer DOD — DOE Data',                schema: 'iq_qfd', table: 'doe',            endpoint: '/qfd/datasource?chart=insight-payer-dod-doe' },
        { id: 'insight-payer-dod-dep',    label: 'Payer DOD — Payments',                schema: 'iq_qfd', table: 'deposit_report', endpoint: '/qfd/datasource?chart=insight-payer-dod-dep' },
        { id: 'insight-payer-dod-adj',    label: 'Payer DOD — Adjustments',             schema: 'iq_qfd', table: 'adj_report',     endpoint: '/qfd/datasource?chart=insight-payer-dod-adj' },
        { id: 'insight-proc-dos',         label: 'Procedure Analysis — DOS',            schema: 'iq_qfd', table: 'dos',            endpoint: '/qfd/datasource?chart=insight-proc-dos' },
        { id: 'insight-proc-doe',         label: 'Procedure Analysis — DOE',            schema: 'iq_qfd', table: 'doe',            endpoint: '/qfd/datasource?chart=insight-proc-doe' },
        { id: 'insight-proc-dod-doe',     label: 'Procedure DOD — DOE Data',            schema: 'iq_qfd', table: 'doe',            endpoint: '/qfd/datasource?chart=insight-proc-dod-doe' },
        { id: 'insight-proc-dod-dep',     label: 'Procedure DOD — Payments',            schema: 'iq_qfd', table: 'deposit_report', endpoint: '/qfd/datasource?chart=insight-proc-dod-dep' },
        { id: 'insight-proc-dod-adj',     label: 'Procedure DOD — Adjustments',         schema: 'iq_qfd', table: 'adj_report',     endpoint: '/qfd/datasource?chart=insight-proc-dod-adj' },
        { id: 'insight-ref-dos',          label: 'Referring Provider Analysis — DOS',   schema: 'iq_qfd', table: 'dos',            endpoint: '/qfd/datasource?chart=insight-ref-dos' },
        { id: 'insight-ref-doe',          label: 'Referring Provider Analysis — DOE',   schema: 'iq_qfd', table: 'doe',            endpoint: '/qfd/datasource?chart=insight-ref-doe' },
        { id: 'insight-ref-dod-doe',      label: 'Referring Provider DOD — DOE Data',   schema: 'iq_qfd', table: 'doe',            endpoint: '/qfd/datasource?chart=insight-ref-dod-doe' },
        { id: 'insight-ref-dod-dep',      label: 'Referring Provider DOD — Payments',   schema: 'iq_qfd', table: 'deposit_report', endpoint: '/qfd/datasource?chart=insight-ref-dod-dep' },
        { id: 'insight-ref-dod-adj',      label: 'Referring Provider DOD — Adjustments',schema: 'iq_qfd', table: 'adj_report',     endpoint: '/qfd/datasource?chart=insight-ref-dod-adj' },
      ],
      // ── Panel Analysis ────────────────────────────────────────────────────
      panel: [
        { id: 'panel-analysis', label: 'Panel Analysis', schema: 'iq_qfd', table: 'panel', endpoint: '/qfd/datasource?chart=panel-analysis' },
      ],
      // ── Turnaround Time ───────────────────────────────────────────────────
      tat: [
        { id: 'tat-last-month', label: 'Turnaround — Last Month',     schema: 'iq_qfd', table: 'turnaround_report',        endpoint: '/qfd/datasource?chart=tat-last-month' },
        { id: 'tat-last-12',    label: 'Turnaround — Last 12 Months', schema: 'iq_qfd', table: 'turnaround_report_last12',  endpoint: '/qfd/datasource?chart=tat-last-12' },
      ],
      // ── Clinical Analysis ─────────────────────────────────────────────────
      clinical: [
        { id: 'clinical-pipeline', label: 'Clinical Analysis', schema: 'iq_qfd', table: 'pipeline_report', endpoint: '/qfd/datasource?chart=clinical-pipeline' },
      ],
    };
    return DS[activeTab] ?? null;
  }, [activeTab, activeView]);

  return (
    <div className="-mt-2 min-w-0" ref={contentRef}>
      {/* Tab bar + Export */}
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

      {/* Tab content */}
      <div className="pt-4">
        {activeTab === 'home' && activeView === 'home' && (
          <QFDHomePage onNavigate={handleNavigate} />
        )}
        {activeTab === 'home' && activeView === 'ccr' && (
          <div className="space-y-3">
            <button
              onClick={() => setActiveView('home')}
              className="text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400 flex items-center gap-1"
            >
              ← Back to Home
            </button>
            <QFDCleanClaimPage onNavigate={handleNavigate} />
          </div>
        )}
        {activeTab === 'payments'   && <QFDPaymentsPage onNavigate={handleNavigate} />}
        {activeTab === 'production' && <QFDProductionPage />}
        {activeTab === 'facilities' && <QFDFacilityPage />}
        {activeTab === 'ar'         && <QFDAccountReceivablePage />}
        {activeTab === 'insight'    && <QFDInsightPage />}
        {activeTab === 'panel'      && <QFDPanelAnalysisPage />}
        {activeTab === 'tat'        && <QFDTurnAroundTimePage />}
        {activeTab === 'clinical'   && <QFDClinicalAnalysisPage />}
      </div>
    </div>
  );
}
