'use strict';

var ajvErrors = require('../index');
var Ajv = require('ajv');
var assert = require('assert');


describe('errorMessage value is a string', function() {
  it('should replace all errors with custom error message', function() {
    var ajvs = [
      ajvErrors(new Ajv({allErrors: true, jsonPointers: true})),
      ajvErrors(new Ajv({allErrors: true, jsonPointers: true, verbose: true}))
    ];

    var schema = {
      type: 'object',
      required: ['foo'],
      properties: {
        foo: { type: 'integer' }
      },
      additionalProperties: false,
      errorMessage: 'should be an object with an integer property foo only'
    };

    ajvs.forEach(function (ajv) {
      var validate = ajv.compile(schema);
      assert.strictEqual(validate({foo: 1}), true);
      testInvalid({},                 ['required']);
      testInvalid({bar: 2},           ['required', 'additionalProperties']);
      testInvalid({foo: 1, bar: 2},   ['additionalProperties']);
      testInvalid({foo: 'a'},         ['type']);
      testInvalid({foo: 'a', bar: 2}, ['type', 'additionalProperties']);
      testInvalid(1,                  ['type']);

      function testInvalid(data, expectedReplacedKeywords) {
        assert.strictEqual(validate(data), false);
        assert.strictEqual(validate.errors.length, 1);
        var err = validate.errors[0];
        assert.strictEqual(err.keyword, 'errorMessage');
        assert.strictEqual(err.message, schema.errorMessage);
        assert.strictEqual(err.dataPath, '');
        assert.strictEqual(err.schemaPath, '#/errorMessage');
        var replacedKeywords = err.params.errors.map(function (e) {
          return e.keyword;
        });
        assert.deepEqual(replacedKeywords.sort(), expectedReplacedKeywords.sort());
      }
    });
  });

  it('should replace all errors with interpolated error message', function() {
    var ajvs = [
      ajvErrors(new Ajv({allErrors: true, jsonPointers: true})),
      ajvErrors(new Ajv({allErrors: true, jsonPointers: true, verbose: true}))
    ];

    var errorMessages = [
      'properties "foo" = ${/foo}, "bar" = ${/bar}, should be integer',
      '${/foo}, ${/bar} are the values of properties "foo", "bar", should be integer',
      'properties "foo", "bar" should be integer, they are ${/foo}, ${/bar}'
    ];

    var schema = {
      type: 'object',
      properties: {
        foo: { type: 'integer' },
        bar: { type: 'integer' }
      },
      errorMessage: 'will be replaced with one of the messages above'
    };

    errorMessages.forEach(function (message) {
      ajvs.forEach(function (ajv) {
        schema = JSON.parse(JSON.stringify(schema));
        schema.errorMessage = message;
        var validate = ajv.compile(schema);
        assert.strictEqual(validate({foo: 1}), true);
        testInvalid({foo: 1.2, bar: 2.3},    ['type', 'type']);
        testInvalid({foo: 'a', bar: 'b'},    ['type', 'type']);
        testInvalid({foo: false, bar: true}, ['type', 'type']);

        function testInvalid(data, expectedReplacedKeywords) {
          assert.strictEqual(validate(data), false);
          assert.strictEqual(validate.errors.length, 1);
          var err = validate.errors[0];
          assert.strictEqual(err.keyword, 'errorMessage');
          var expectedMessage = schema.errorMessage
                                  .replace('${/foo}', JSON.stringify(data.foo))
                                  .replace('${/bar}', JSON.stringify(data.bar));
          assert.strictEqual(err.message, expectedMessage);
          assert.strictEqual(err.dataPath, '');
          assert.strictEqual(err.schemaPath, '#/errorMessage');
          var replacedKeywords = err.params.errors.map(function (e) {
            return e.keyword;
          });
          assert.deepEqual(replacedKeywords.sort(), expectedReplacedKeywords.sort());
        }
      });
    });
  });
});
