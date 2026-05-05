import api from './axiosInstance';

export const neurowatchApi = {
  // Home page
  getKpis:                  () => api.get('/neurowatch/kpis'),
  getPaymentHistory:        () => api.get('/neurowatch/payment-history'),
  getPaymentHistoryFull:    () => api.get('/neurowatch/payment-history-full'),
  getChargesVsPayments:     () => api.get('/neurowatch/charges-vs-payments'),
  getChargesVsPaymentsFull: () => api.get('/neurowatch/charges-vs-payments-full'),
  getArPie:                 () => api.get('/neurowatch/ar-pie'),
  getArDonut:               () => api.get('/neurowatch/ar-donut'),
  getTotalCharges:          () => api.get('/neurowatch/total-charges'),
  getTotalChargesFull:      () => api.get('/neurowatch/total-charges-full'),
  getAdjustments:           () => api.get('/neurowatch/adjustments'),
  getAdjustmentsFull:       () => api.get('/neurowatch/adjustments-full'),
  // Payments page
  getPaymentLineChart:      () => api.get('/neurowatch/payments/line'),
  getDepositsBySurgeon:     () => api.get('/neurowatch/payments/surgeon'),
  getDepositsByHospital:    () => api.get('/neurowatch/payments/hospital'),
  getDepositsByBillingType: () => api.get('/neurowatch/payments/billing-type'),
  getDepositsByInsurance:   () => api.get('/neurowatch/payments/insurance'),
  // Production page
  getProductionDosChart:    () => api.get('/neurowatch/production/dos-chart'),
  getProductionDoeChart:    () => api.get('/neurowatch/production/doe-chart'),
  getProductionDosReimb:    () => api.get('/neurowatch/production/dos-reimb'),
  getProductionDoeReimb:    () => api.get('/neurowatch/production/doe-reimb'),
  getProductionDodByPayer:  () => api.get('/neurowatch/production/dod-payer'),
  getProductionDodByBiller: () => api.get('/neurowatch/production/dod-biller'),
  // AR page
  getArDos:         ()              => api.get('/neurowatch/ar/dos'),
  getArDoe:         ()              => api.get('/neurowatch/ar/doe'),
  getArTreemap:     (mode)          => api.get('/neurowatch/ar/treemap?mode=' + (mode || 'dos')),
  getArByInsurance: (mode)          => api.get('/neurowatch/ar/insurance?mode=' + (mode || 'dos')),
  getArBySurgeon:   (mode, surgeon) => api.get('/neurowatch/ar/surgeon?mode=' + (mode || 'dos') + '&surgeon=' + encodeURIComponent(surgeon || 'All')),
  getArSurgeons:    ()              => api.get('/neurowatch/ar/surgeons'),
  // Insights page
  getInsightsInsurance:   ()        => api.get('/neurowatch/insights/insurance'),
  getInsightsSurgeon:     (surgeon) => api.get('/neurowatch/insights/surgeon'    + (surgeon ? '?surgeon=' + encodeURIComponent(surgeon) : '')),
  getInsightsReader:      (reader)  => api.get('/neurowatch/insights/reader'     + (reader  ? '?reader='  + encodeURIComponent(reader)  : '')),
  getInsightsTechnician:  (tech)    => api.get('/neurowatch/insights/technician' + (tech    ? '?tech='    + encodeURIComponent(tech)    : '')),
  getInsightsSurgeonList: ()        => api.get('/neurowatch/insights/surgeon-list'),
  getInsightsReaderList:  ()        => api.get('/neurowatch/insights/reader-list'),
  getInsightsTechList:    ()        => api.get('/neurowatch/insights/tech-list'),
  // Procedure page
  getProcedureDeposits: ()      => api.get('/neurowatch/procedure/deposits'),
  getProcedureCharges:  (mode)  => api.get('/neurowatch/procedure/charges?mode=' + (mode || 'dos')),
  getProcedureMore:     (mode)  => api.get('/neurowatch/procedure/more?mode='    + (mode || 'dos')),
  getProcedureDodMore:  ()      => api.get('/neurowatch/procedure/dod-more'),
};
