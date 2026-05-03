'use strict';

const arService = require('../services/ar.service');
const { ok }    = require('../utils/responseHelper');

async function getArDos(req, res, next) {
  try {
    const { carrier = null, financialClass = null } = req.query;
    return ok(res, await arService.getArBuckets('dos', carrier, financialClass));
  } catch (err) { next(err); }
}

async function getArDoe(req, res, next) {
  try {
    const { carrier = null, financialClass = null } = req.query;
    return ok(res, await arService.getArBuckets('doe', carrier, financialClass));
  } catch (err) { next(err); }
}

async function getArCarrier(req, res, next) {
  try {
    const { dateMode = 'dos', bucket = null, financialClass = null } = req.query;
    return ok(res, await arService.getArCarrier(dateMode, bucket, financialClass));
  } catch (err) { next(err); }
}

async function getArFinancial(req, res, next) {
  try {
    const { dateMode = 'dos', bucket = null, carrier = null } = req.query;
    return ok(res, await arService.getArFinancial(dateMode, bucket, carrier));
  } catch (err) { next(err); }
}

module.exports = { getArDos, getArDoe, getArCarrier, getArFinancial };
