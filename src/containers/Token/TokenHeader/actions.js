import { isValidClassicAddress, isValidXAddress } from 'divvy-address-codec';
import { getToken } from '../../../divvyd';
import { analytics, ANALYTIC_TYPES, BAD_REQUEST } from '../../shared/utils';
import * as actionTypes from './actionTypes';

export const loadTokenState = (currency, accountId) => dispatch => {
  if (!isValidClassicAddress(accountId) && !isValidXAddress(accountId)) {
    dispatch({
      type: actionTypes.ACCOUNT_STATE_LOAD_FAIL,
      status: BAD_REQUEST,
      error: '',
    });
    return Promise.resolve();
  }

  dispatch({
    type: actionTypes.START_LOADING_ACCOUNT_STATE,
  });
  return getToken(currency, accountId)
    .then(data => {
      dispatch({ type: actionTypes.FINISHED_LOADING_ACCOUNT_STATE });
      dispatch({
        type: actionTypes.ACCOUNT_STATE_LOAD_SUCCESS,
        data,
      });
    })
    .catch(error => {
      const status = error.code;
      analytics(ANALYTIC_TYPES.exception, {
        exDescription: `token ${currency}.${accountId} --- ${JSON.stringify(error)}`,
      });
      dispatch({ type: actionTypes.FINISHED_LOADING_ACCOUNT_STATE });
      dispatch({
        type: actionTypes.ACCOUNT_STATE_LOAD_FAIL,
        error: status === 500 ? 'get_account_state_failed' : '',
        status,
      });
    });
};

export { loadTokenState as default };
