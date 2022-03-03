import { encodeNodePublic } from 'divvy-address-codec';

import { getNegativeUNL as getDivvydNegativeUNL } from './lib/divvyd';
import logger from './lib/logger';

const log = logger({ name: 'nunl' });

const getNegativeUNL = () => {
  log.info(`getting nUNL from divvyd`);

  return getDivvydNegativeUNL()
    .then(result => {
      if (result === undefined || result.length === 0) return [];

      if (result.node === undefined) throw new Error('node is not a included in this ledger_entry');

      const validators = result.node.DisabledValidators;
      if (validators !== undefined) {
        return validators
          .map(obj => obj.DisabledValidator.PublicKey)
          .map(key => encodeNodePublic(Buffer.from(key, 'hex')));
      }

      return [];
    })
    .catch(error => {
      log.error(error.toString());
      throw error;
    });
};

export default getNegativeUNL;
