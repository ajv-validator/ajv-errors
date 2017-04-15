'use strict';

module.exports = function (ajv) {
  ajv.addKeyword('errorMessage', {
    inline: require('./lib/dotjs/errorMessage'),
    statements: true,
    valid: true,
    errors: 'full',
    metaSchema: {
      'type': 'string'
    }
  });
  return ajv;
};
