'use strict';

const ajvErrors = require('..');
const Ajv = require('ajv').default;
const assert = require('assert');


describe('ajv-errors', () => {
  it('should return ajv instance', () => {
    const ajv = new Ajv({allErrors: true});
    const _ajv = ajvErrors(ajv);
    assert.equal(_ajv, ajv);
  });

  it('should throw if option allErrors is not set', () => {
    const ajv = new Ajv;
    assert.throws(() => {
      ajvErrors(ajv);
    });
  });

  it('should throw if option jsPropertySyntax is set', () => {
    const ajv = new Ajv({allErrors: true, jsPropertySyntax: true, logger: false});
    assert.throws(() => {
      ajvErrors(ajv);
    });
  });
});
