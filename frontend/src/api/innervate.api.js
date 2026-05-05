import api from './axiosInstance';

export const innervateApi = {
  // Home page
  getKpis:                      () => api.get('/innervate/home/kpis'),
  getPaymentHistory:            () => api.get('/innervate/home/payment-history'),
  getPaymentHistoryFull:        () => api.get('/innervate/home/payment-history-full'),
  getChargesVsPayments:         () => api.get('/innervate/home/charges-vs-payments'),
  getChargesVsPaymentsFull:     () => api.get('/innervate/home/charges-vs-payments-full'),
  getArPie:                     () => api.get('/innervate/home/accounts-receivable'),
  getTotalCharges:              () => api.get('/innervate/home/total-charges'),
  getTotalChargesFull:          () => api.get('/innervate/home/total-charges-full'),
  getAdjustments:               () => api.get('/innervate/home/total-adjustments'),
  getAdjustmentsFull:           () => api.get('/innervate/home/total-adjustments-full'),
  getArDonut:                   () => api.get('/innervate/home/ar-aging'),
  // Payments page
  getPaymentLineChart:          () => api.get('/innervate/payments/line'),
  getDepositsBySurgeon:         () => api.get('/innervate/payments/surgeon'),
  getDepositsByHospital:        () => api.get('/innervate/payments/hospital'),
  getDepositsByBillingType:     () => api.get('/innervate/payments/billing-type'),
  getDepositsByInsurance:       () => api.get('/innervate/payments/insurance-type'),
  // Production page
  getProductionDosChart:        () => api.get('/innervate/production/dos'),
  getProductionDoeChart:        () => api.get('/innervate/production/doe'),
  getProductionDosReimb:        () => api.get('/innervate/production/reimbursement/dos'),
  getProductionDoeReimb:        () => api.get('/innervate/production/reimbursement/doe'),
  getProductionDodAdjustments:  () => api.get('/innervate/production/dod/adjustments'),
  getProductionDodPayments:     () => api.get('/innervate/production/dod/payments'),
  getProductionDodByPayer:      () => api.get('/innervate/production/dod/payer'),
  getProductionDodByBillerEntity: () => api.get('/innervate/production/dod/biller-entity'),
  // AR page
  getArDos:                     () => api.get('/innervate/ar/dos'),
  getArDoe:                     () => api.get('/innervate/ar/doe'),
  getArInsurance:               (mode) => api.get('/innervate/ar/insurance?mode=' + mode),
  getArSurgeon:                 (mode) => api.get('/innervate/ar/surgeon?mode=' + mode),
  // Insights page
  getInsightsInsurance:         () => api.get('/innervate/insights/insurance'),
  getInsightsSurgeon:           (filter) => api.get('/innervate/insights/surgeon' + (filter ? '?filter=' + encodeURIComponent(filter) : '')),
  getInsightsReader:            (filter) => api.get('/innervate/insights/reader'  + (filter ? '?filter=' + encodeURIComponent(filter) : '')),
  getInsightsTechnician:        (filter) => api.get('/innervate/insights/technician' + (filter ? '?filter=' + encodeURIComponent(filter) : '')),
  getInsightsSurgeonList:       () => api.get('/innervate/insights/surgeon-list'),
  getInsightsReaderList:        () => api.get('/innervate/insights/reader-list'),
  getInsightsTechList:          () => api.get('/innervate/insights/tech-list'),
  // Procedure page
  getProcedureDeposits:         () => api.get('/innervate/procedure/deposits'),
  getProcedureCharges:          (mode) => api.get('/innervate/procedure/charges?mode=' + mode),
  getProcedureMore:             (mode) => api.get('/innervate/procedure/more?mode=' + mode),
  getProcedureDodMore:          () => api.get('/innervate/procedure/dod-more'),
};
