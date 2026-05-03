import api from './axiosInstance';

export const usneuroApi = {
  // Home page
  getKpis:                  () => api.get('/usneuro/kpis'),
  getPaymentHistory:        () => api.get('/usneuro/payment-history'),
  getPaymentHistoryFull:    () => api.get('/usneuro/payment-history-full'),
  getChargesVsPayments:     () => api.get('/usneuro/charges-vs-payments'),
  getChargesVsPaymentsFull: () => api.get('/usneuro/charges-vs-payments-full'),
  getCcrHistory:            () => api.get('/usneuro/ccr-history'),
  getArPie:                 () => api.get('/usneuro/ar-pie'),
  getTotalCharges:          () => api.get('/usneuro/total-charges'),
  getTotalChargesFull:      () => api.get('/usneuro/total-charges-full'),
  getAdjustments:           () => api.get('/usneuro/adjustments'),
  getAdjustmentsFull:       () => api.get('/usneuro/adjustments-full'),
  getArDonut:               () => api.get('/usneuro/ar-donut'),
  getDenialReasons:         () => api.get('/usneuro/denial-reasons'),
  // Payments page
  getPaymentLineChart:      (mode) => api.get('/usneuro/payments/line',           { params: { mode } }),
  getDepositsBySurgeon:     (mode) => api.get('/usneuro/payments/surgeon',        { params: { mode } }),
  getDepositsByHospital:    (mode) => api.get('/usneuro/payments/hospital',       { params: { mode } }),
  getDepositsByBillingType: (mode) => api.get('/usneuro/payments/billing-type',   { params: { mode } }),
  getDepositsByInsurance:   (mode) => api.get('/usneuro/payments/insurance-type', { params: { mode } }),
  // Production page
  getProductionDosChart:    () => api.get('/usneuro/production/dos-chart'),
  getProductionDoeChart:    () => api.get('/usneuro/production/doe-chart'),
  getProductionDosReimb:    () => api.get('/usneuro/production/dos-reimb'),
  getProductionDoeReimb:    () => api.get('/usneuro/production/doe-reimb'),
  getProductionDodByPayer:  () => api.get('/usneuro/production/dod-payer'),
  getProductionDodByBiller: () => api.get('/usneuro/production/dod-biller'),
  // AR page
  getArDos:               ()                       => api.get('/usneuro/ar/dos'),
  getArDoe:               ()                       => api.get('/usneuro/ar/doe'),
  getArTreemap:           (mode)                   => api.get('/usneuro/ar/treemap',   { params: { mode } }),
  getArByInsurance:       (mode)                   => api.get('/usneuro/ar/insurance', { params: { mode } }),
  getArBySurgeon:         (mode, surgeon)          => api.get('/usneuro/ar/surgeon',   { params: { mode, surgeon } }),
  getArSurgeons:          ()                       => api.get('/usneuro/ar/surgeons'),
  // Insights page
  getInsightsByInsurance: ()        => api.get('/usneuro/insights/insurance'),
  getInsightsBySurgeon:   (surgeon) => api.get('/usneuro/insights/surgeon',  { params: { surgeon } }),
  getInsightsSurgeons:    ()        => api.get('/usneuro/insights/surgeons'),
};
