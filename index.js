'use strict';

module.exports = function (ajv) {
  if (!ajv._opts.allErrors) throw new Error('Ajv option allErrors must be true');

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
