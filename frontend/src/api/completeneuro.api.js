import api from './axiosInstance';

export const completeneuroApi = {
  // Home page
  getKpis:                  () => api.get('/completeneuro/kpis'),
  getPaymentHistory:        () => api.get('/completeneuro/payment-history'),
  getPaymentHistoryFull:    () => api.get('/completeneuro/payment-history-full'),
  getChargesVsPayments:     () => api.get('/completeneuro/charges-vs-payments'),
  getChargesVsPaymentsFull: () => api.get('/completeneuro/charges-vs-payments-full'),
  getCcrHistory:            () => api.get('/completeneuro/ccr-history'),
  getArPie:                 () => api.get('/completeneuro/ar-pie'),
  getTotalCharges:          () => api.get('/completeneuro/total-charges'),
  getTotalChargesFull:      () => api.get('/completeneuro/total-charges-full'),
  getAdjustments:           () => api.get('/completeneuro/adjustments'),
  getAdjustmentsFull:       () => api.get('/completeneuro/adjustments-full'),
  getArDonut:               () => api.get('/completeneuro/ar-donut'),
  // Payments page
  getPaymentLineChart:        () => api.get('/completeneuro/payments/line'),
  getDepositsBySurgeon:       (month) => api.get('/completeneuro/payments/surgeon',        { params: month ? { month } : {} }),
  getDepositsByHospital:      (month) => api.get('/completeneuro/payments/hospital',       { params: month ? { month } : {} }),
  getDepositsByBillingType:   (month) => api.get('/completeneuro/payments/billing-type',   { params: month ? { month } : {} }),
  getDepositsByInsuranceType: (month) => api.get('/completeneuro/payments/insurance-type', { params: month ? { month } : {} }),
  // Production page
  getProductionDosChart:         () => api.get('/completeneuro/production/dos-chart'),
  getProductionDoeChart:         () => api.get('/completeneuro/production/doe-chart'),
  getProductionDosReimbursement: () => api.get('/completeneuro/production/dos-reimbursement'),
  getProductionDoeReimbursement: () => api.get('/completeneuro/production/doe-reimbursement'),
  getProductionDodAdjustments:   () => api.get('/completeneuro/production/dod-adjustments'),
  getProductionDodPayments:      () => api.get('/completeneuro/production/dod-payments'),
  getProductionDodByPayer:       () => api.get('/completeneuro/production/dod-by-payer'),
  getProductionDodByBiller:      () => api.get('/completeneuro/production/dod-by-biller'),
  getProductionDodReimbursement: () => api.get('/completeneuro/production/dod-reimbursement'),
  // Accounts Receivable page
  getArDos:         () => api.get('/completeneuro/ar/dos'),
  getArDoe:         () => api.get('/completeneuro/ar/doe'),
  getArByInsurance: (view) => api.get('/completeneuro/ar/insurance', { params: { view } }),
  getArBySurgeon:   (view) => api.get('/completeneuro/ar/surgeon',   { params: { view } }),
  // Insights page
  getInsightsInsurance:   () => api.get('/completeneuro/insights/insurance'),
  getInsightsSurgeon:     () => api.get('/completeneuro/insights/surgeon'),
  getInsightsReader:      () => api.get('/completeneuro/insights/reader'),
  getInsightsTechnician:  () => api.get('/completeneuro/insights/technician'),
  // Procedure page
  getProcedureDepositsChart:      ()     => api.get('/completeneuro/procedure/deposits'),
  getProcedureChargesChart:       (mode) => api.get(`/completeneuro/procedure/charges?mode=${mode}`),
  getProcedureMore:               (mode) => api.get(`/completeneuro/procedure/more?mode=${mode}`),
  getProcedureDodMore:            ()     => api.get('/completeneuro/procedure/dod-more'),
  getProcedureDodAdjustments:     ()     => api.get('/completeneuro/procedure/dod-adjustments'),
  getProcedureDodPaymentsHistory: ()     => api.get('/completeneuro/procedure/dod-payments-history'),
  getProcedureDodByBillingEntity: ()     => api.get('/completeneuro/procedure/dod-billing-entity'),
  getProcedureDodByPayer:         ()     => api.get('/completeneuro/procedure/dod-payer'),
};
