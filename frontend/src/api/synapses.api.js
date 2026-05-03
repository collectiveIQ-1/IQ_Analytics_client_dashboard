import api from './axiosInstance';

const _qs = (f) => { if (!f) return ''; const p = new URLSearchParams(); Object.entries(f).forEach(([k,v]) => { if (v != null && v !== '') p.set(k, v); }); const s = p.toString(); return s ? '?' + s : ''; };

export const synapsesApi = {
  // Home page
  getKpis:                  () => api.get('/synapses/kpis'),
  getPaymentHistory:        () => api.get('/synapses/payment-history'),
  getPaymentHistoryFull:    () => api.get('/synapses/payment-history-full'),
  getChargesVsPayments:     () => api.get('/synapses/charges-vs-payments'),
  getChargesVsPaymentsFull: () => api.get('/synapses/charges-vs-payments-full'),
  getCcrHistory:            () => api.get('/synapses/ccr-history'),
  getArPie:                 () => api.get('/synapses/ar-pie'),
  getTotalCharges:          () => api.get('/synapses/total-charges'),
  getTotalChargesFull:      () => api.get('/synapses/total-charges-full'),
  getAdjustments:           () => api.get('/synapses/adjustments'),
  getAdjustmentsFull:       () => api.get('/synapses/adjustments-full'),
  getArDonut:               () => api.get('/synapses/ar-donut'),
  getDenialReasons:         () => api.get('/synapses/denial-reasons'),
  // Payments page (filter-aware, cross-filtering)
  getPaymentsLine:          (f) => api.get('/synapses/payments/line'           + _qs(f)),
  getPaymentsBySurgeon:     (f) => api.get('/synapses/payments/surgeon'        + _qs(f)),
  getPaymentsByHospital:    (f) => api.get('/synapses/payments/hospital'       + _qs(f)),
  getPaymentsByBillingType: (f) => api.get('/synapses/payments/billing-type'   + _qs(f)),
  getPaymentsByInsuranceType:(f)=> api.get('/synapses/payments/insurance-type' + _qs(f)),
  // Production page
  getDodAdjustmentsAllTime:     () => api.get('/synapses/production/dod-adjustments'),
  getProductionDosChart:        () => api.get('/synapses/production/dos-chart'),
  getProductionDoeChart:        () => api.get('/synapses/production/doe-chart'),
  getProductionDosReimb:        () => api.get('/synapses/production/dos-reimb'),
  getProductionDoeReimb:        () => api.get('/synapses/production/doe-reimb'),
  getProductionDodByPayer:      () => api.get('/synapses/production/dod-payer'),
  getProductionDodByBiller:     () => api.get('/synapses/production/dod-biller'),
  // AR page
  getArDos:                     () => api.get('/synapses/ar/dos'),
  getArDoe:                     () => api.get('/synapses/ar/doe'),
  getArInsurance:               (mode) => api.get('/synapses/ar/insurance?mode=' + mode),
  getArSurgeon:                 (mode) => api.get('/synapses/ar/surgeon?mode=' + mode),
  // Procedure page
  getProcedureDeposits:         () => api.get('/synapses/procedure/deposits'),
  getProcedureCharges:          (mode) => api.get('/synapses/procedure/charges?mode=' + mode),
  getProcedureMore:             (mode) => api.get('/synapses/procedure/more?mode=' + mode),
  getProcedureDodMore:          () => api.get('/synapses/procedure/dod-more'),
  // Insights page
  getInsightsInsurance:         () => api.get('/synapses/insights/insurance'),
  getInsightsSurgeon:           (filter) => api.get('/synapses/insights/surgeon' + (filter ? '?filter=' + encodeURIComponent(filter) : '')),
  getInsightsReader:            (filter) => api.get('/synapses/insights/reader'  + (filter ? '?filter=' + encodeURIComponent(filter) : '')),
  getInsightsTechnician:        (filter) => api.get('/synapses/insights/technician' + (filter ? '?filter=' + encodeURIComponent(filter) : '')),
  getInsightsSurgeonList:       () => api.get('/synapses/insights/surgeon-list'),
  getInsightsReaderList:        () => api.get('/synapses/insights/reader-list'),
  getInsightsTechList:          () => api.get('/synapses/insights/tech-list'),
};
