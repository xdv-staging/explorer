import React, { Component } from 'react';
import fetch from 'node-fetch';
import PropTypes from 'prop-types';
import { createHash } from 'crypto';
import { localizeDate } from '../../shared/utils';

const cachedAmendmentIDs = {};
let cachedDivvydVersions = {};

const states = {
  loading: 'Loading',
  unknown: 'Unknown',
};

const TIME_ZONE = 'UTC';
const DATE_OPTIONS = {
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour12: true,
  timeZone: TIME_ZONE,
};

class EnableAmendment extends Component {
  static async fetchAmendmentNames() {
    const response = await fetch(
      'https://raw.githubusercontent.com/xdv-staging/divvyd/develop/src/divvy/protocol/impl/Feature.cpp'
    );
    const text = await response.text();

    const amendmentNames = [];
    text.split('\n').forEach(line => {
      const name = line.match(/^\s*REGISTER_F[A-Z]+\s*\((\S+),\s*.*$/);
      if (name) {
        amendmentNames.push(name[1]);
      }
      const name2 = line.match(/^ .*retireFeature\("(\S+)"\)[,;].*$/);
      if (name2) {
        amendmentNames.push(name2[1]);
      }
    });
    return amendmentNames;
  }

  static sha512Half(buffer) {
    return createHash('sha512')
      .update(buffer)
      .digest('hex')
      .toUpperCase()
      .slice(0, 64);
  }

  static async nameOfAmendmentID(id) {
    if (cachedAmendmentIDs[id]) {
      return cachedAmendmentIDs[id];
    }
    // The Amendment ID is the hash of the Amendment name
    const amendmentNames = await this.fetchAmendmentNames();
    amendmentNames.forEach(name => {
      cachedAmendmentIDs[this.sha512Half(Buffer.from(name, 'ascii'))] = name;
    });
    return cachedAmendmentIDs[id];
  }

  static async fetchMinDivvydVersions() {
    const response = await fetch(
      'https://raw.githubusercontent.com/xdv-staging/xdvl-dev-portal/3b07e8295d0eebed07aeb0a5d40289ac91d2b5c9/content/concepts/consensus-network/amendments/known-amendments.md'
    );
    const text = await response.text();
    const mapping = {};

    text.split('\n').forEach(line => {
      const found = line.match(/\| \[([a-zA-Z0-9]+)\][^\n]+\| (v[0-9]*.[0-9]*.[0-9]*|TBD) *\|/);
      if (found) {
        // eslint-disable-next-line prefer-destructuring
        mapping[found[1]] = found[2];
      }
    });

    return mapping;
  }

  static async getDivvydVersion(name) {
    if (cachedDivvydVersions[name]) {
      return cachedDivvydVersions[name];
    }
    cachedDivvydVersions = await this.fetchMinDivvydVersions();
    return cachedDivvydVersions[name];
  }

  constructor(props) {
    super(props);
    const { data, language } = this.props;
    let status;
    let expected = states.unknown;
    const txDate = new Date(data.instructions.date);

    switch (data.instructions.flags) {
      case undefined:
        status = 'Enabled';
        break;
      case 65536:
        status = 'Got Majority';
        expected = localizeDate(txDate.setDate(txDate.getDate() + 14), language, DATE_OPTIONS);
        break;
      case 131072:
        status = 'Lost Majority';
        break;
      default:
        status = states.unknown;
    }

    this.state = {
      amendmentName: states.loading,
      amendmentStatus: status,
      minDivvydVersion: states.loading,
      expectedDate: expected,
    };
  }

  componentDidMount() {
    const { data } = this.props;
    EnableAmendment.nameOfAmendmentID(data.instructions.amendment).then(name => {
      if (name) {
        EnableAmendment.getDivvydVersion(name).then(divvydVersion => {
          if (divvydVersion) {
            this.setState({ amendmentName: name, minDivvydVersion: divvydVersion });
          } else {
            this.setState({ amendmentName: name, minDivvydVersion: states.unknown });
          }
        });
      } else {
        this.setState({ amendmentName: states.unknown, minDivvydVersion: states.unknown });
      }
    });
  }

  render() {
    const { amendmentName, amendmentStatus, minDivvydVersion, expectedDate } = this.state;
    return (
      <>
        {[
          <div className="row">
            <div className="label">Amendment Name </div>
            <div className="value">{amendmentName}</div>
          </div>,
          <div className="row">
            <div className="label">Amendment Status </div>
            <div className="value">
              <a href="https://xdv.io/enableamendment.html#enableamendment-flags">
                {amendmentStatus}
              </a>
            </div>
          </div>,
          <div className="row">
            <div className="label">Introduced In </div>
            <div className="value">{minDivvydVersion}</div>
          </div>,
          amendmentStatus === 'Got Majority' ? (
            <div className="row">
              <div className="label">Expected Date </div>
              <div className="value">{expectedDate}</div>
            </div>
          ) : null,
        ]}
      </>
    );
  }
}

EnableAmendment.propTypes = {
  data: PropTypes.objectOf(
    PropTypes.oneOfType([PropTypes.string, PropTypes.object, PropTypes.number, PropTypes.array])
  ).isRequired,
  language: PropTypes.string.isRequired,
};

export default EnableAmendment;
