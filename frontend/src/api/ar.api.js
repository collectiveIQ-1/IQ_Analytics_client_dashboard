import api from './axiosInstance';

export const arApi = {
  // Bucket bar/pie — optional carrier and/or financialClass cross-filter
  getDos: (carrier = null, financialClass = null) =>
    api.get('/ar/dos', {
      params: {
        ...(carrier        && carrier        !== 'all' ? { carrier }        : {}),
        ...(financialClass && financialClass !== 'all' ? { financialClass } : {}),
      },
    }),

  getDoe: (carrier = null, financialClass = null) =>
    api.get('/ar/doe', {
      params: {
        ...(carrier        && carrier        !== 'all' ? { carrier }        : {}),
        ...(financialClass && financialClass !== 'all' ? { financialClass } : {}),
      },
    }),

  // Carrier treemap — optional bucket and/or financialClass cross-filter
  getCarrier: (dateMode, bucket, financialClass = null) =>
    api.get('/ar/carrier', {
      params: {
        dateMode,
        ...(bucket         && bucket         !== 'all' ? { bucket }        : {}),
        ...(financialClass && financialClass !== 'all' ? { financialClass } : {}),
      },
    }),

  // Financial pie — optional bucket and/or carrier cross-filter
  getFinancial: (dateMode, bucket, carrier = null) =>
    api.get('/ar/financial', {
      params: {
        dateMode,
        ...(bucket  && bucket  !== 'all' ? { bucket }  : {}),
        ...(carrier && carrier !== 'all' ? { carrier }  : {}),
      },
    }),
};
