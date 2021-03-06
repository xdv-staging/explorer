import { post } from 'axios';
import { hostname } from 'os';
import { unix } from 'moment';
import { Error, _BASE, EPOCH_OFFSET } from './utils';

const HOSTNAME = hostname();
const N_UNL_INDEX = '2E8A59AA9D3B5B186B0B9E0F62E6C02587CA74A4D778938E957B6357D364B244';

const formatEscrow = d => ({
  id: d.index,
  account: d.Account,
  destination: d.Destination,
  amount: d.Amount / _BASE,
  condition: d.Condition,
  cancelAfter: d.CancelAfter
    ? unix(d.CancelAfter + EPOCH_OFFSET)
        .utc()
        .format()
    : undefined,
  finishAfter: d.FinishAfter
    ? unix(d.FinishAfter + EPOCH_OFFSET)
        .utc()
        .format()
    : undefined,
});

const formatPaychannel = d => ({
  id: d.index,
  account: d.Account,
  destination: d.Destination,
  amount: d.Amount / _BASE,
  balance: d.Balance / _BASE,
  settleDelay: d.SettleDelay,
});

const executeQuery = (url, options) => {
  const params = { options, headers: { 'X-User': HOSTNAME } };
  return post(`/api/v1/cors/${url}`, params).catch(error => {
    const message =
      error.response && error.response.error_message
        ? error.response.error_message
        : error.toString();
    const code = error.response && error.response.status ? error.response.status : 500;
    throw new Error(`URL: ${url} - ${message}`, code);
  });
};

// generic RPC query
function query(...options) {
  return executeQuery(process.env.REACT_APP_DIVVYD_HOST, ...options);
}

// If there is a separate peer to peer (not reporting mode) server for admin requests, use it.
// Otherwise use the default url for everything.
function queryP2P(...options) {
  return executeQuery(
    process.env.REACT_APP_P2P_DIVVYD_HOST ?? process.env.REACT_APP_DIVVYD_HOST,
    ...options
  );
}

// get ledger
const getLedger = parameters => {
  const request = {
    method: 'ledger',
    params: [{ ...parameters, transactions: true, expand: true }],
  };

  return query(request)
    .then(resp => resp.data.result)
    .then(resp => {
      if (resp.error_message === 'ledgerNotFound') {
        throw new Error('ledger not found', 404);
      }

      if (resp.error_message === 'ledgerIndexMalformed') {
        throw new Error('invalid ledger index/hash', 400);
      }

      if (resp.error_message) {
        throw new Error(resp.error_message, 500);
      }

      if (!resp.validated) {
        throw new Error('ledger not validated', 404);
      }
      return resp.ledger;
    });
};

// get transaction
const getTransaction = txHash => {
  const params = {
    method: 'tx',
    params: [{ transaction: txHash }],
  };

  return query(params)
    .then(resp => resp.data.result)
    .then(resp => {
      if (resp.error === 'txnNotFound') {
        throw new Error('transaction not found', 404);
      }

      if (resp.error === 'notImpl') {
        throw new Error('invalid transaction hash', 400);
      }

      if (resp.error_message) {
        throw new Error(resp.error_message, 500);
      }

      if (!resp.validated) {
        throw new Error('transaction not validated', 500);
      }
      return resp;
    });
};

// get account info
const getAccountInfo = (account, ledger_index = 'validated') =>
  query({
    method: 'account_info',
    params: [{ account, ledger_index, signer_lists: true }],
  })
    .then(resp => resp.data.result)
    .then(resp => {
      if (resp.error === 'actNotFound') {
        throw new Error('account not found', 404);
      }

      if (resp.error_message) {
        throw new Error(resp.error_message, 500);
      }

      return Object.assign(resp.account_data, {
        ledger_index: resp.ledger_index,
      });
    });

// get account escrows
const getAccountEscrows = (account, ledger_index = 'validated') =>
  query({
    method: 'account_objects',
    params: [{ account, ledger_index, type: 'escrow', limit: 400 }],
  })
    .then(resp => resp.data.result)
    .then(resp => {
      if (resp.error === 'actNotFound') {
        throw new Error('account not found', 404);
      }

      if (resp.error_message) {
        throw new Error(resp.error_message, 500);
      }

      if (!resp.account_objects.length) {
        return undefined;
      }

      const escrows = { in: [], out: [], total: 0, totalIn: 0, totalOut: 0 };
      resp.account_objects.forEach(d => {
        const amount = Number(d.Amount);
        escrows.total += amount;
        if (account === d.Destination) {
          escrows.in.push(formatEscrow(d));
          escrows.totalIn += amount;
        } else {
          escrows.out.push(formatEscrow(d));
          escrows.totalOut += amount;
        }
      });

      escrows.total /= _BASE;
      escrows.totalIn /= _BASE;
      escrows.totalOut /= _BASE;
      return escrows;
    });

// get account paychannels
const getAccountPaychannels = async (account, ledger_index = 'validated') => {
  const list = [];
  let remaining = 0;
  const getChannels = marker =>
    query({
      method: 'account_objects',
      params: [{ marker, account, ledger_index, type: 'payment_channel', limit: 400 }],
    })
      .then(resp => resp.data.result)
      .then(resp => {
        if (resp.error === 'actNotFound') {
          throw new Error('account not found', 404);
        }

        if (resp.error_message) {
          throw new Error(resp.error_message, 500);
        }

        if (!resp.account_objects.length) {
          return undefined;
        }

        list.push(...resp.account_objects);
        if (resp.marker) {
          return getChannels(resp.marker);
        }

        return null;
      });

  await getChannels();
  const channels = list.map(c => {
    remaining += c.Amount - c.Balance;
    return formatPaychannel(c);
  });
  return channels.length
    ? {
        channels,
        total_available: remaining / _BASE,
      }
    : null;
};

// get Token balance summary
const getBalances = (account, ledger_index = 'validated') =>
  queryP2P({
    method: 'gateway_balances',
    params: [{ account, ledger_index }],
  })
    .then(resp => resp.data.result)
    .then(resp => {
      if (resp.error === 'actNotFound') {
        throw new Error('account not found', 404);
      }

      if (resp.error_message) {
        throw new Error(resp.error_message, 500);
      }

      return resp;
    });

// get account transactions
const getAccountTransactions = (account, limit = 20, marker = '') => {
  const markerComponents = marker.split('.');
  const ledger = parseInt(markerComponents[0], 10);
  const seq = parseInt(markerComponents[1], 10);
  return query({
    method: 'account_tx',
    params: [
      {
        account,
        limit,
        ledger_index_max: -1,
        ledger_index_min: -1,
        marker: marker
          ? {
              ledger,
              seq,
            }
          : undefined,
      },
    ],
  })
    .then(resp => resp.data.result)
    .then(resp => {
      if (resp.error === 'actNotFound') {
        throw new Error('account not found', 404);
      }

      if (resp.error_message) {
        throw new Error(resp.error_message, 500);
      }
      return {
        transactions: resp.transactions,
        marker: resp.marker ? `${resp.marker.ledger}.${resp.marker.seq}` : undefined,
      };
    });
};

const getNegativeUNL = () =>
  query({
    method: 'ledger_entry',
    params: [
      {
        index: N_UNL_INDEX,
      },
    ],
  })
    .then(resp => resp.data.result)
    .then(resp => {
      if (resp.error === 'entryNotFound') {
        return [];
      }

      if (resp.error_message) {
        throw new Error(resp.error_message, 500);
      }

      return resp;
    });

const getServerInfo = () =>
  query({
    method: 'server_info',
  })
    .then(resp => resp.data.result)
    .then(resp => {
      if (resp.error !== undefined || resp.error_message !== undefined) {
        throw new Error(resp.error_message || resp.error, 500);
      }

      return resp;
    });

const getOffers = (currencyCode, issuerAddress, pairCurrencyCode, pairIssuerAddress) => {
  return query({
    method: 'book_offers',
    params: [
      {
        taker_gets: {
          currency: `${currencyCode.toUpperCase()}`,
          issuer: currencyCode.toUpperCase() === '' ? undefined : `${issuerAddress}`,
        },
        taker_pays: {
          currency: `${pairCurrencyCode.toUpperCase()}`,
          issuer: pairCurrencyCode.toUpperCase() === '' ? undefined : `${pairIssuerAddress}`,
        },
      },
    ],
  })
    .then(resp => resp.data.result)
    .then(resp => {
      if (resp.error !== undefined || resp.error_message !== undefined) {
        throw new Error(resp.error_message || resp.error, 500);
      }

      return resp;
    });
};
export {
  getLedger,
  getTransaction,
  getAccountInfo,
  getAccountEscrows,
  getAccountPaychannels,
  getBalances,
  getAccountTransactions,
  getNegativeUNL,
  getServerInfo,
  getOffers,
};
