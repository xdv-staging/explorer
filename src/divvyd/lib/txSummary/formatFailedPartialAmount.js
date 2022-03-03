module.exports = d =>
  d.value
    ? {
        currency: d.currency,
        issuer: d.issuer,
        amount: 0,
      }
    : {
        currency: '',
        amount: 0,
      };
