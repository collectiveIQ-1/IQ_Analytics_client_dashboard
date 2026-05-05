/**
 * InnervateDashboard.jsx — Innervate client dashboard container.
 *
 * Tabs: Home | Payments | Productions | Accounts Receivable | Insights | Procedure
 * No CCR — Innervate has no CCR tables.
 *
 * Mirrors IOM Help Dashboard structure exactly.
 */

import { useState, useRef, useMemo } from 'react';
import { Home, DollarSign, Activity, FileText, BarChart2, Layers } from 'lucide-react';
import InnervateHomePage              from '../innervate/InnervateHomePage';
import InnervatePaymentsPage          from '../innervate/InnervatePaymentsPage';
import InnervateProductionPage        from '../innervate/InnervateProductionPage';
import InnervateAccountReceivablePage from '../innervate/InnervateAccountReceivablePage';
import InnervateInsightsPage          from '../innervate/InnervateInsightsPage';
import InnervateProcedurePage         from '../innervate/InnervateProcedurePage';
import ExportMenu                     from '../../../components/dashboard/ExportMenu';

const TABS = [
  { id: 'home',       label: 'Home',               icon: Home },
  { id: 'payments',   label: 'Payments',            icon: DollarSign },
  { id: 'production', label: 'Productions',         icon: Activity },
  { id: 'ar',         label: 'Accounts Receivable', icon: FileText },
  { id: 'insights',   label: 'Insights',            icon: BarChart2 },
  { id: 'procedure',  label: 'Procedure',           icon: Layers },
];

export default function InnervateDashboard({ clientId }) {
  const [tab, setTab] = useState('home');
  const contentRef = useRef(null);

  const handleNavigate = (view) => {
    if (view === 'payments') setTab('payments');
  };

  const handleTabClick = (tabId) => setTab(tabId);

  const exportTitle = useMemo(() => {
    const t = TABS.find(x => x.id === tab);
    return 'Innervate - ' + (t?.label ?? tab);
  }, [tab]);

  const exportFileName = useMemo(
    () => 'Innervate-' + tab + '-' + new Date().toISOString().slice(0, 10),
    [tab]
  );

  const datasourceItems = useMemo(() => {
    const DS = {
      home: [
        { id: 'payment-history',     label: 'Payment History',        table: 'innervate_full_deposit', endpoint: '/innervate/home/payment-history' },
        { id: 'charges-vs-payments', label: 'Charges vs Payments',    table: 'innervate_full_billing', endpoint: '/innervate/home/charges-vs-payments' },
        { id: 'accounts-receivable', label: 'Accounts Receivable',    table: 'innervate_full_billing', endpoint: '/innervate/home/accounts-receivable' },
        { id: 'total-charges',       label: 'Total Charges',          table: 'innervate_full_billing', endpoint: '/innervate/home/total-charges' },
        { id: 'total-adjustments',   label: 'Total Adjustments',      table: 'innervate_full_billing', endpoint: '/innervate/home/total-adjustments' },
        { id: 'ar-aging',            label: 'AR % > 60+ Days',        table: 'innervate_full_billing', endpoint: '/innervate/home/ar-aging' },
      ],
      payments: [
        { id: 'payment-line',       label: 'All Time Payment History',   table: 'innervate_full_deposit', endpoint: '/innervate/payments/line' },
        { id: 'deposits-surgeon',   label: 'Deposits by Surgeon',        table: 'innervate_full_deposit', endpoint: '/innervate/payments/surgeon' },
        { id: 'deposits-hospital',  label: 'Deposits by Hospital',       table: 'innervate_full_deposit', endpoint: '/innervate/payments/hospital' },
        { id: 'deposits-billing',   label: 'Deposits by Billing Type',   table: 'innervate_full_deposit', endpoint: '/innervate/payments/billing-type' },
        { id: 'deposits-insurance', label: 'Deposits by Insurance Type', table: 'innervate_full_deposit', endpoint: '/innervate/payments/insurance-type' },
      ],
      production: [
        { id: 'production-dos',    label: 'Production by DOS',            table: 'innervate_full_billing', endpoint: '/innervate/production/dos' },
        { id: 'production-doe',    label: 'Production by DOE',            table: 'innervate_full_billing', endpoint: '/innervate/production/doe' },
        { id: 'reimb-dos',         label: 'Reimbursement Analysis (DOS)', table: 'innervate_full_billing', endpoint: '/innervate/production/reimbursement/dos' },
        { id: 'reimb-doe',         label: 'Reimbursement Analysis (DOE)', table: 'innervate_full_billing', endpoint: '/innervate/production/reimbursement/doe' },
        { id: 'dod-adjustments',   label: 'DOD Adjustment History',       table: 'innervate_full_billing', endpoint: '/innervate/production/dod/adjustments' },
        { id: 'dod-payments',      label: 'DOD Payments History',         table: 'innervate_full_billing', endpoint: '/innervate/production/dod/payments' },
        { id: 'dod-payer',         label: 'DOD Deposit by Payer',         table: 'innervate_full_billing', endpoint: '/innervate/production/dod/payer' },
        { id: 'dod-biller-entity', label: 'DOD Deposit by Billing Entity',table: 'innervate_full_billing', endpoint: '/innervate/production/dod/biller-entity' },
      ],
      ar: [
        { id: 'ar-dos',       label: 'AR by DOS (Buckets)',     table: 'innervate_full_billing', endpoint: '/innervate/ar/dos' },
        { id: 'ar-doe',       label: 'AR by DOE (Buckets)',     table: 'innervate_full_billing', endpoint: '/innervate/ar/doe' },
        { id: 'ar-insurance', label: 'AR by Insurance (Pivot)', table: 'innervate_full_billing', endpoint: '/innervate/ar/insurance' },
        { id: 'ar-surgeon',   label: 'AR by Surgeon (Pivot)',   table: 'innervate_full_billing', endpoint: '/innervate/ar/surgeon' },
      ],
      insights: [
        { id: 'insights-insurance',  label: 'Insurance Wise Analysis',  table: 'innervate_full_billing', endpoint: '/innervate/insights/insurance' },
        { id: 'insights-surgeon',    label: 'Surgeon Wise Analysis',    table: 'innervate_full_billing', endpoint: '/innervate/insights/surgeon' },
        { id: 'insights-reader',     label: 'Reader Wise Analysis',     table: 'innervate_full_billing', endpoint: '/innervate/insights/reader' },
        { id: 'insights-technician', label: 'Technician Wise Analysis', table: 'innervate_full_billing', endpoint: '/innervate/insights/technician' },
      ],
      procedure: [
        { id: 'proc-deposits',  label: 'Deposits by Procedure Type',       table: 'innervate_full_deposit', endpoint: '/innervate/procedure/deposits' },
        { id: 'proc-charges',   label: 'Charges by Procedure Type',        table: 'innervate_full_billing', endpoint: '/innervate/procedure/charges' },
        { id: 'proc-dos-more',  label: 'Charges by Procedure Type (DOS)',   table: 'innervate_full_billing', endpoint: '/innervate/procedure/more?mode=dos' },
        { id: 'proc-doe-more',  label: 'Charges by Procedure Type (DOE)',   table: 'innervate_full_billing', endpoint: '/innervate/procedure/more?mode=doe' },
        { id: 'proc-dod-more',  label: 'Deposits by Procedure Type (DOD)', table: 'innervate_full_deposit', endpoint: '/innervate/procedure/dod-more' },
      ],
    };
    return DS[tab] ?? null;
  }, [tab]);

  return (
    <div className="-mt-2" ref={contentRef}>
      <div className="flex items-center justify-between gap-2">
        <div className="overflow-x-auto flex-1">
          <nav className="flex gap-0.5 border-b border-slate-100 dark:border-zinc-800">
            {TABS.map(({ id, label, icon: Icon }) => {
              const isActive = tab === id;
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
          <ExportMenu
            targetRef={contentRef}
            fileName={exportFileName}
            title={exportTitle}
            datasourceItems={datasourceItems}
            exportClient="innervate"
          />
        </div>
      </div>

      <div className="pt-4">
        {tab === 'home'       && <InnervateHomePage onNavigate={handleNavigate} />}
        {tab === 'payments'   && <InnervatePaymentsPage />}
        {tab === 'production' && <InnervateProductionPage />}
        {tab === 'ar'         && <InnervateAccountReceivablePage />}
        {tab === 'insights'   && <InnervateInsightsPage />}
        {tab === 'procedure'  && <InnervateProcedurePage />}
      </div>
    </div>
  );
}
