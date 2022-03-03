const WebSocket = require('ws');
const streams = require('./streams');
const log = require('./logger')({ name: 'xdvl ws' });

const DIVVYDS = [
  {
    host: process.env.DIVVYD_HOST,
    port: process.env.DIVVYD_WS_PORT,
    primary: true,
  },
];

let connections = [];

if (process.env.DIVVYD_SECONDARY) {
  process.env.DIVVYD_SECONDARY.split(',').forEach(d => {
    const divvyd = d.split(':');
    DIVVYDS.push({
      host: divvyd[0],
      port: divvyd[1] || 51233,
    });
  });
}

const connect = divvyd => {
  log.info(`${divvyd.host}:${divvyd.port} connecting...`);
  const ws = new WebSocket(`ws://${divvyd.host}:${divvyd.port}`);
  ws.divvyd = divvyd;

  // handle close
  ws.on('close', () => {
    log.info(`${divvyd.host} closed`);
    ws.last = Date.now();
  });

  // handle error
  ws.on('error', e => {
    log.error(`${divvyd.host} error - ${e.toString()}`);
  });

  // subscribe and save new connections
  ws.on('open', () => {
    log.info(`${divvyd.host} connected`);
    ws.send(
      JSON.stringify({
        command: 'subscribe',
        streams: divvyd.primary ? ['ledger'] : [],
      })
    );
  });

  // handle messages
  ws.on('message', message => {
    ws.last = Date.now();
    let data;
    try {
      data = JSON.parse(message);
    } catch (e) {
      log.error('message parse error', message);
      log.error(e);
    }
    if (data.type === 'ledgerClosed') {
      streams.handleLedger(data);
    }
  });

  return ws;
};

const checkHeartbeat = () => {
  connections.forEach((ws, i) => {
    if (Date.now() - ws.last > 10000) {
      ws.terminate();
      log.info(`attempt reconnect ${ws.divvyd.host}`);
      connections[i] = connect(ws.divvyd);
    }
  });
};

setInterval(checkHeartbeat, 2000);

module.exports.start = () => {
  connections = DIVVYDS.map(connect);
};
