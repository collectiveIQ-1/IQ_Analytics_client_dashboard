import api from './axiosInstance';

export const ionmApi = {
  // Home page
  getKpis:                  () => api.get('/ionm/kpis'),
  getPaymentHistory:        () => api.get('/ionm/payment-history'),
  getPaymentHistoryFull:    () => api.get('/ionm/payment-history-full'),
  getChargesVsPayments:     () => api.get('/ionm/charges-vs-payments'),
  getChargesVsPaymentsFull: () => api.get('/ionm/charges-vs-payments-full'),
  getCcrHistory:            () => api.get('/ionm/ccr-history'),
  getArPie:                 () => api.get('/ionm/ar-pie'),
  getTotalCharges:          () => api.get('/ionm/total-charges'),
  getTotalChargesFull:      () => api.get('/ionm/total-charges-full'),
  getAdjustments:           () => api.get('/ionm/adjustments'),
  getAdjustmentsFull:       () => api.get('/ionm/adjustments-full'),
  getArDonut:               () => api.get('/ionm/ar-donut'),
  getDenialReasons:         () => api.get('/ionm/denial-reasons'),
  // Payments page
  getPaymentLineChart:          () => api.get('/ionm/payments/line'),
  getDepositsBySurgeon:         () => api.get('/ionm/payments/surgeon'),
  getDepositsByHospital:        () => api.get('/ionm/payments/hospital'),
  getDepositsByBillingType:     () => api.get('/ionm/payments/billing-type'),
  getDepositsByInsurance:       () => api.get('/ionm/payments/insurance'),
  // Production page
  getProductionDosChart:        () => api.get('/ionm/production/dos-chart'),
  getProductionDoeChart:        () => api.get('/ionm/production/doe-chart'),
  getProductionDosReimb:        () => api.get('/ionm/production/dos-reimb'),
  getProductionDoeReimb:        () => api.get('/ionm/production/doe-reimb'),
  getProductionDodByPayer:      () => api.get('/ionm/production/dod-payer'),
  getProductionDodByBiller:     () => api.get('/ionm/production/dod-biller'),
  // AR page
  getArDos:                     () => api.get('/ionm/ar/dos'),
  getArDoe:                     () => api.get('/ionm/ar/doe'),
  getArInsurance:               (mode) => api.get('/ionm/ar/insurance?mode=' + mode),
  getArSurgeon:                 (mode) => api.get('/ionm/ar/surgeon?mode=' + mode),
  // Procedure page
  getProcedureDeposits:         () => api.get('/ionm/procedure/deposits'),
  getProcedureCharges:          (mode) => api.get('/ionm/procedure/charges?mode=' + mode),
  getProcedureMore:             (mode) => api.get('/ionm/procedure/more?mode=' + mode),
  getProcedureDodMore:          () => api.get('/ionm/procedure/dod-more'),
  // Insights page
  getInsightsInsurance:         () => api.get('/ionm/insights/insurance'),
  getInsightsSurgeon:           (filter) => api.get('/ionm/insights/surgeon' + (filter ? '?filter=' + encodeURIComponent(filter) : '')),
  getInsightsReader:            (filter) => api.get('/ionm/insights/reader'  + (filter ? '?filter=' + encodeURIComponent(filter) : '')),
  getInsightsTechnician:        (filter) => api.get('/ionm/insights/technician' + (filter ? '?filter=' + encodeURIComponent(filter) : '')),
  getInsightsSurgeonList:       () => api.get('/ionm/insights/surgeon-list'),
  getInsightsReaderList:        () => api.get('/ionm/insights/reader-list'),
  getInsightsTechList:          () => api.get('/ionm/insights/tech-list'),
  // IDR Payment Summary page
  getIdrPaymentTrend:           () => api.get('/ionm/idr/payment-trend'),
  getIdrStatusCount:            () => api.get('/ionm/idr/status-count'),
  getIdrProTech:                () => api.get('/ionm/idr/pro-tech'),
  getIdrInsurance:              () => api.get('/ionm/idr/insurance'),
};
