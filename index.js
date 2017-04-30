'use strict';

module.exports = function (ajv) {
  if (!ajv._opts.allErrors) throw new Error('Ajv option allErrors must be true');

  ajv.addKeyword('errorMessage', {
    inline: require('./lib/dotjs/errorMessage'),
    statements: true,
    valid: true,
    errors: 'full',
    config: {
      CHILD_ERRORS: ['properties', 'items'],
      ALLOW_OBJECT: ['required', 'dependencies']
    },
    metaSchema: {
      'type': ['string', 'object'],
      properties: {
        properties: {$ref: '#/definitions/stringMap'},
        items: {$ref: '#/definitions/stringList'},
        required: {$ref: '#/definitions/stringOrMap'},
        dependencies: {$ref: '#/definitions/stringOrMap'}
      },
      additionalProperties: {'type': 'string'},
      definitions: {
        stringMap: {
          'type': ['object'],
          additionalProperties: {'type': 'string'}
        },
        stringOrMap: {
          'type': ['string', 'object'],
          additionalProperties: {'type': 'string'}
        },
        stringList: {
          'type': ['array'],
          items: {'type': 'string'}
        }
      }
    }
  });
  return ajv;
};
