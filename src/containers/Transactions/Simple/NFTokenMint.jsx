import React from 'react';
import PropTypes from 'prop-types';

const NFTokenMint = props => {
  const {
    data: {
      instructions: { tokenID, tokenTaxon, uri },
    },
  } = props;

  return (
    <>
      <div className="row flex-wrap">
        <div className="label">Token ID</div>
        <div className="value">
          <div className="dt">{tokenID}</div>
        </div>
      </div>
      <div className="row">
        <div className="label">Token Taxon</div>
        <div className="value">{tokenTaxon}</div>
      </div>
      <div className="row">
        <div className="label">URI</div>
        <div className="value">{uri}</div>
      </div>
    </>
  );
};

NFTokenMint.propTypes = {
  data: PropTypes.shape({
    instructions: PropTypes.shape({
      tokenID: PropTypes.string,
      tokenTaxon: PropTypes.number,
      uri: PropTypes.string,
    }),
  }).isRequired,
};

export default NFTokenMint;
