'use strict';

var ajvErrors = require('../index');
var Ajv = require('ajv');
var assert = require('assert');


describe('errorMessage value is a string', function() {
  it('should replace all errors with custom error message', function() {
    var ajv = new Ajv({allErrors: true});
    ajvErrors(ajv);

    var schema = {
      type: 'object',
      required: ['foo'],
      properties: {
        foo: true/*{ type: 'integer' }*/
      },
      additionalProperties: false,
      errorMessage: 'should be an object with an integer property foo only'
    };

    var validate = ajv.compile(schema);
    assert.strictEqual(validate({foo: 1}), true);
    testInvalid({}, ['required']);
    testInvalid({bar: 2}, ['required', 'additionalProperties']);
    testInvalid({foo: 1, bar: 2}, ['additionalProperties']);
    // testInvalid({foo: 'a'}, ['type']);
    // testInvalid({foo: 'a', bar: 2}, ['type', 'additionalProperties']);
    testInvalid(1, ['type']);

    function testInvalid(data, expectedReplacedKeywords) {
      assert.strictEqual(validate(data), false);
      assert.strictEqual(validate.errors.length, 1);
      // console.log(validate.errors);
      var replacedKeywords = validate.errors[0].params.errors.map(function (err) {
        return err.keyword;
      });
      assert.deepEqual(replacedKeywords.sort(), expectedReplacedKeywords.sort());
    }
  });
});
