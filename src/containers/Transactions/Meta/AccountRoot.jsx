import React from 'react';
import { Trans } from 'react-i18next';
import { CURRENCY_OPTIONS, _BASE } from '../../shared/transactionUtils';
import { localizeNumber } from '../../shared/utils';
import Account from '../../shared/components/Account';

const render = (t, language, action, node, index) => {
  const fields = node.FinalFields || node.NewFields || { Balance: 0 };
  const prev = node.PreviousFields || { Balance: 0 };
  const change = (fields.Balance - prev.Balance) / _BASE;
  const numberOption = { ...CURRENCY_OPTIONS, currency: '' };
  const prevBalance = localizeNumber(prev.Balance / _BASE, language, numberOption);
  const finalBalance = localizeNumber(fields.Balance / _BASE, language, numberOption);

  const renderLine2 = () => {
    if (change > 0) {
      return (
        <ul key={`account_balance_increased_${index}`} className="meta-line">
          <li>
            <Trans i18nKey="account_balance_increased">
              Balance increased by
              <b>
                {localizeNumber(change, language, numberOption)}
                <small></small>
              </b>
              from
              <b>
                {prevBalance}
                <small></small>
              </b>
              to
              <b>
                {finalBalance}
                <small></small>
              </b>
            </Trans>
          </li>
        </ul>
      );
    }
    if (change < 0) {
      return (
        <ul key={`account_balance_reduced_${index}`} className="meta-line">
          <li>
            <Trans i18nKey="account_balance_decreased">
              Balance decreased by
              <b>
                {localizeNumber(change, language, numberOption)}
                <small></small>
              </b>
              from
              <b>
                {prevBalance}
                <small></small>
              </b>
              to
              <b>
                {finalBalance}
                <small></small>
              </b>
            </Trans>
          </li>
        </ul>
      );
    }

    return null;
  };

  const renderLine1 = () =>
    fields && fields.Account ? (
      <>
        {t('owned_account_root', { action })} <Account account={fields.Account} />
      </>
    ) : (
      t('unowned_account_root', { action })
    );

  return (
    <li key={`account_root_${index}`} className="meta-line">
      {renderLine1()}
      {renderLine2()}
    </li>
  );
};

export default render;
