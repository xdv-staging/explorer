import logger from './lib/logger';
import { Error } from './lib/utils';
import { getServerInfo } from './lib/divvyd';

const log = logger({ name: 'serverInfo' });

const getQuorum = () => {
  log.info(`fetching server_info from divvyd`);

  return getServerInfo()
    .then(result => {
      if (result === undefined || result.info === undefined) {
        throw Error('Undefined result from getServerInfo()');
      }

      const quorum = result.info.validation_quorum;
      if (quorum === undefined) {
        throw Error('Undefined validation_quorum');
      }

      return quorum;
    })
    .catch(error => {
      log.error(error.toString());
      throw error;
    });
};

export default getQuorum;
