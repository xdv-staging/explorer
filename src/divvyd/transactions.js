import logger from './lib/logger';
import { formatTransaction } from './lib/utils';
import { getTransaction as getDivvydTransaction } from './lib/divvyd';
import summarize from './lib/txSummary';

const log = logger({ name: 'transactions' });

const getTransaction = transactionId => {
  log.info(`get tx: ${transactionId}`);
  return getDivvydTransaction(transactionId)
    .then(response => {
      return formatTransaction(response);
    })
    .then(data => ({
      summary: summarize(data, true).details,
      raw: data,
    }))
    .then(data => {
      return data;
    })
    .catch(error => {
      log.error(error.toString());
      throw error;
    });
};

export default getTransaction;
