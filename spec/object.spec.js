'use strict';

var ajvErrors = require('../index');
var Ajv = require('ajv');
var assert = require('assert');


describe('errorMessage value is an object', function() {
  describe('keywords', function() {
    it('should replace keyword errors with custom error message', function() {
      var ajv = new Ajv({allErrors: true});
      ajvErrors(ajv);

      var schema = {
        type: 'object',
        required: ['foo'],
        properties: {
          foo: { type: 'integer' }
        },
        additionalProperties: false,
        errorMessage: {
          type: 'should be an object',
          required: 'should have property foo',
          additionalProperties: 'should not have properties other than foo'
        }
      };

      var validate = ajv.compile(schema);
      assert.strictEqual(validate({foo: 1}), true);
      testInvalid({},                 [['required']]);
      testInvalid({bar: 2},           [['required'], ['additionalProperties']]);
      testInvalid({foo: 1, bar: 2},   [['additionalProperties']]);
      testInvalid({foo: 'a'},         ['type']);
      testInvalid({foo: 'a', bar: 2}, ['type', ['additionalProperties']]);
      testInvalid(1,                  [['type']]);

      function testInvalid(data, expectedErrors) {
        assert.strictEqual(validate(data), false);
        assert.strictEqual(validate.errors.length, expectedErrors.length);
        validate.errors.forEach(function (err, i) {
          var expectedErr = expectedErrors[i];
          if (Array.isArray(expectedErr)) { // errorMessage error
            assert.strictEqual(err.keyword, 'errorMessage');
            assert.strictEqual(err.message, schema.errorMessage[err.params.errors[0].keyword]);
            assert.strictEqual(err.dataPath, '');
            assert.strictEqual(err.schemaPath, '#');
            var replacedKeywords = err.params.errors.map(function (e) {
              return e.keyword;
            });
            assert.deepEqual(replacedKeywords.sort(), expectedErr.sort());
          } else { // original error
            assert.strictEqual(err.keyword, expectedErr);
          }
        });
      }
    });



  });
});
