'use strict';

var ajvErrors = require('../index');
var Ajv = require('ajv');
var assert = require('assert');


describe('ajv-errors', function() {
  it('should return ajv instance', function() {
    var ajv = new Ajv({allErrors: true});
    var _ajv = ajvErrors(ajv);
    assert.equal(_ajv, ajv);
  });

  it('should throw if option allErrors is not set', function() {
    var ajv = new Ajv;
    assert.throws(function() {
      ajvErrors(ajv);
    });
  });
});
