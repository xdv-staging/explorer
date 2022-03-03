const formatAmount = require('./formatAmount');
const utils = require('../utils');

module.exports = tx => ({
  amount: formatAmount(tx.Amount),
  destination: tx.Destination !== tx.Account ? tx.Destination : undefined,
  condition: tx.Condition,
  cancelAfter: tx.CancelAfter ? utils.convertDivvyDate(tx.CancelAfter) : undefined,
  finishAfter: tx.FinishAfter ? utils.convertDivvyDate(tx.FinishAfter) : undefined,
});
