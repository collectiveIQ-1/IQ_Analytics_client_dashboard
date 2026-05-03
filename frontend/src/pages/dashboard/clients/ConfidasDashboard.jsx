/**
 * ConfidasDashboard.jsx — Confidas Orthopedic & Spine PLLC dashboard container.
 *
 * Tab navigation: Home | Payments | Productions | Facilities | Accounts Receivable | Insights
 * CCR is a sub-view within the Home tab (navigated from the Clean Claim Rate KPI card).
 */

import { useState, useRef, useMemo } from 'react';
import {
  Home, DollarSign, Activity, Building2, CreditCard, Lightbulb,
} from 'lucide-react';
import ConfidasHomePage        from '../confidas/ConfidasHomePage';
import ConfidasPaymentsPage    from '../confidas/ConfidasPaymentsPage';
import ConfidasProductionsPage from '../confidas/ConfidasProductionsPage';
import ConfidasFacilityPage   from '../confidas/ConfidasFacilityPage';
import ConfidasArPage          from '../confidas/ConfidasArPage';
import ConfidasCleanClaimPage  from '../confidas/ConfidasCleanClaimPage';
import ConfidasInsightPage     from '../confidas/ConfidasInsightPage';
import ExportMenu              from '../../../components/dashboard/ExportMenu';

const TABS = [
  { id: 'home',        label: 'Home',               icon: Home       },
  { id: 'payments',    label: 'Payments',            icon: DollarSign },
  { id: 'productions', label: 'Productions',         icon: Activity   },
  { id: 'facilities',  label: 'Facilities',          icon: Building2  },
  { id: 'ar',          label: 'Accounts Receivable', icon: CreditCard },
  { id: 'insights',    label: 'Insights',            icon: Lightbulb  },
];

function ComingSoon({ label }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-3">
        <Activity size={20} className="text-red-500" />
      </div>
      <h3 className="text-base font-semibold text-slate-700 dark:text-zinc-200 mb-1">{label}</h3>
      <p className="text-sm text-slate-400 dark:text-zinc-500">This section is under development.</p>
    </div>
  );
}

export default function ConfidasDashboard({ clientId }) {
  const [activeTab,  setActiveTab]  = useState('home');
  const [activeView, setActiveView] = useState('home');
  const contentRef = useRef(null);

  const handleNavigate = (view) => {
    if (view === 'ccr')      { setActiveView('ccr');   setActiveTab('home');     }
    if (view === 'payments') { setActiveTab('payments'); setActiveView('home');  }
    if (view === 'ar')       { setActiveTab('ar');       setActiveView('home');  }
  };

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    setActiveView('home');
  };

  const exportTitle = useMemo(() => {
    if (activeTab === 'home' && activeView === 'ccr') return 'Confidas — Clean Claim Rate';
    const tab = TABS.find(t => t.id === activeTab);
    return 'Confidas — ' + (tab?.label ?? activeTab);
  }, [activeTab, activeView]);

  const exportFileName = useMemo(() => {
    const base = activeTab === 'home' && activeView === 'ccr'
      ? 'Confidas-CleanClaimRate'
      : 'Confidas-' + activeTab;
    return base + '-' + new Date().toISOString().slice(0, 10);
  }, [activeTab, activeView]);

  const datasourceItems = useMemo(() => {
    if (activeTab === 'home' && activeView === 'ccr') {
      return [{ id: 'ccr-history', label: 'CCR History', table: 'ccr_history', endpoint: '/confidas/datasource?chart=ccr-history' }];
    }
    const DS = {
      home: [
        { id: 'payment-history',     label: 'Payment History (DOD)',          table: 'deposit_report',      endpoint: '/confidas/datasource?chart=payment-history' },
        { id: 'charges-vs-payments', label: 'Charges vs Payments (DOE)',      table: 'doe',                 endpoint: '/confidas/datasource?chart=charges-vs-payments' },
        { id: 'accounts-receivable', label: 'Accounts Receivable',            table: 'full_ar',             endpoint: '/confidas/datasource?chart=accounts-receivable' },
        { id: 'ccr-history',         label: 'CCR History',                    table: 'ccr_history',         endpoint: '/confidas/datasource?chart=ccr-history' },
      ],
      payments: [
        { id: 'payment-history',      label: 'Payment History',               table: 'deposit_report',      endpoint: '/confidas/datasource?chart=payment-history' },
        { id: 'payment-history-full', label: 'All Time Payment History',      table: 'full_deposit_report', endpoint: '/confidas/datasource?chart=payment-history-full' },
        { id: 'bank-deposits',        label: 'Bank Deposits',                 table: 'bank',                endpoint: '/confidas/datasource?chart=bank-deposits' },
        { id: 'deposits-by-provider', label: 'Deposits by Provider',          table: 'deposit_report',      endpoint: '/confidas/datasource?chart=deposits-by-provider' },
      ],
      productions: [
        { id: 'production-dos', label: 'Production — DOS', table: 'dos', endpoint: '/confidas/datasource?chart=production-dos' },
        { id: 'production-doe', label: 'Production — DOE', table: 'doe', endpoint: '/confidas/datasource?chart=production-doe' },
      ],
      facilities: [
        { id: 'facility-dos', label: 'Facility Analysis — DOS', table: 'dos', endpoint: '/confidas/datasource?chart=facility-dos' },
        { id: 'facility-doe', label: 'Facility Analysis — DOE', table: 'doe', endpoint: '/confidas/datasource?chart=facility-doe' },
      ],
      ar: [
        { id: 'ar-bar',       label: 'AR by Bucket',         table: 'full_ar', endpoint: '/confidas/datasource?chart=ar-bar' },
        { id: 'ar-carrier',   label: 'AR by Carrier',        table: 'full_ar', endpoint: '/confidas/datasource?chart=ar-carrier' },
        { id: 'ar-financial', label: 'AR by Financial Class', table: 'full_ar', endpoint: '/confidas/datasource?chart=ar-financial' },
      ],
      insights: [
        { id: 'insight-dos', label: 'Insights — DOS', table: 'dos', endpoint: '/confidas/datasource?chart=insight-dos' },
        { id: 'insight-doe', label: 'Insights — DOE', table: 'doe', endpoint: '/confidas/datasource?chart=insight-doe' },
      ],
    };
    return DS[activeTab] ?? null;
  }, [activeTab, activeView]);

  return (
    <div className="-mt-2" ref={contentRef}>

      {/* Tab bar + Export */}
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

      {/* Tab content */}
      <div className="pt-4">

        {/* Home — main view */}
        {activeTab === 'home' && activeView === 'home' && (
          <ConfidasHomePage onNavigate={handleNavigate} />
        )}

        {/* Home — CCR sub-view */}
        {activeTab === 'home' && activeView === 'ccr' && (
          <div className="space-y-3">
            <button
              onClick={() => setActiveView('home')}
              className="text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400 flex items-center gap-1"
            >
              ← Back to Home
            </button>
            <ConfidasCleanClaimPage onNavigate={handleNavigate} />
          </div>
        )}

        {activeTab === 'payments'    && <ConfidasPaymentsPage />}
        {activeTab === 'productions' && <ConfidasProductionsPage />}
        {activeTab === 'facilities'  && <ConfidasFacilityPage />}
        {activeTab === 'ar'          && <ConfidasArPage />}
        {activeTab === 'insights'    && <ConfidasInsightPage />}

      </div>
    </div>
  );
}
