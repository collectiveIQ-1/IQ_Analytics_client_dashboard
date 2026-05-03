import api from './axiosInstance';

export const qfdApi = {
  getKpis:               () => api.get('/qfd/kpis'),
  getPaymentHistory:     () => api.get('/qfd/payment-history'),
  getPaymentHistoryFull: () => api.get('/qfd/payment-history-full'),
  getBankDepositHistory: () => api.get('/qfd/bank-deposit-history'),

  // Provider chart — optional facility cross-filter
  getDepositsByReferringProvider: (monthDate, facilityName = null) =>
    api.get('/qfd/deposits-by-referring-provider', {
      params: {
        ...(monthDate    ? { month: monthDate }    : {}),
        ...(facilityName && facilityName !== 'all' ? { facility: facilityName } : {}),
      },
    }),

  // Facility chart — optional provider cross-filter
  getDepositsByFacility: (monthDate, providerName = null) =>
    api.get('/qfd/deposits-by-facility', {
      params: {
        ...(monthDate    ? { month: monthDate }    : {}),
        ...(providerName && providerName !== 'all' ? { provider: providerName } : {}),
      },
    }),

  getChargesVsPayments:     () => api.get('/qfd/charges-vs-payments'),
  getChargesVsPaymentsFull: () => api.get('/qfd/charges-vs-payments-full'),
  getCcrHistory:            () => api.get('/qfd/ccr-history'),
  getArPie:                 () => api.get('/qfd/ar-pie'),
  getTotalCharges:          () => api.get('/qfd/total-charges'),
  getTotalChargesFull:      () => api.get('/qfd/total-charges-full'),
  getAdjustments:           () => api.get('/qfd/adjustments'),
  getAdjustmentsFull:       () => api.get('/qfd/adjustments-full'),
  getArDonut:               () => api.get('/qfd/ar-donut'),
  getDenialReasons:         () => api.get('/qfd/denial-reasons'),

  // Production
  getProductionDosChart:         () => api.get('/qfd/production/dos-chart'),
  getProductionDodByMethod:      () => api.get('/qfd/production/dod-by-method'),
  getProductionDosReimbursement: () => api.get('/qfd/production/dos-reimbursement'),
  getProductionDoeReimbursement: () => api.get('/qfd/production/doe-reimbursement'),
  getProductionDodReimbursement: () => api.get('/qfd/production/dod-reimbursement'),
};
