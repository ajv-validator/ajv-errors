'use strict';

var ajvErrors = require('../index');
var Ajv = require('ajv');
var assert = require('assert');


describe('ajv-errors', function() {
  it('should return ajv instance', function() {
    var ajv = new Ajv;
    var _ajv = ajvErrors(ajv);
    assert.equal(_ajv, ajv);
  });
});
