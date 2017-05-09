'use strict';

var ajvErrors = require('../index');
var Ajv = require('ajv');
var assert = require('assert');


describe('options', function() {
  var ajv;

  beforeEach(function() {
    ajv = new Ajv({allErrors: true, jsonPointers: true});
  });

  describe('keepErrors = true', function() {
    beforeEach(function() {
      ajvErrors(ajv, {keepErrors: true});
    });

    describe('errorMessage is a string', function() {
      it('should keep matched errors and mark them with {emUsed: true} property', function() {
        var schema = {
          type: 'object',
          required: ['foo', 'bar'],
          properties: {
            foo: {
              type: 'object',
              properties: {
                baz: {
                  type: 'integer'
                }
              },
              errorMessage: 'should be an object with an integer property baz'
            },
            bar: {
              type: 'integer'
            }
          }
        };

        var validate = ajv.compile(schema);
        assert.strictEqual(validate({foo: {baz: 1}, bar: 2}), true);
        assert.strictEqual(validate({foo: 1}), false);

        assertErrors(validate, [
          {
            keyword: 'type',
            dataPath: '/foo',
            emUsed: true
          },
          {
            keyword: 'errorMessage',
            message: 'should be an object with an integer property baz',
            dataPath: '/foo',
            errors: ['type']
          },
          {
            keyword: 'required',
            dataPath: ''
          }
        ]);
      });
    });

    describe('errorMessage is an object with keywords', function() {
      it('should keep matched errors and mark them with {emUsed: true} property', function() {
        var schema = {
          type: 'number',
          minimum: 2,
          maximum: 10,
          multipleOf: 2,
          errorMessage: {
            type: 'should be number',
            minimum: 'should be >= 2',
            maximum: 'should be <= 10'
          }
        };

        var validate = ajv.compile(schema);
        assert.strictEqual(validate(4), true);
        assert.strictEqual(validate(11), false);

        assertErrors(validate, [
          {
            keyword: 'maximum',
            dataPath: '',
            emUsed: true
          },
          {
            keyword: 'multipleOf',
            dataPath: ''
          },
          {
            keyword: 'errorMessage',
            message: 'should be <= 10',
            dataPath: '',
            errors: ['maximum']
          }
        ]);
      });
    });

    describe('errorMessage is an object with keywords', function() {
      it('should keep matched errors and mark them with {emUsed: true} property', function() {
        var schema = {
          type: 'object',
          properties: {
            foo: {type: 'number'},
            bar: {type: 'string'}
          },
          errorMessage: {
            properties: {
              foo: 'foo should be a number'
            }
          }
        };

        var validate = ajv.compile(schema);
        assert.strictEqual(validate({foo: 1, bar: 'a'}), true);
        assert.strictEqual(validate({foo: 'a', bar: 1}), false);

        assertErrors(validate, [
          {
            keyword: 'type',
            dataPath: '/foo',
            emUsed: true
          },
          {
            keyword: 'type',
            dataPath: '/bar',
          },
          {
            keyword: 'errorMessage',
            message: 'foo should be a number',
            dataPath: '/foo',
            errors: ['type']
          }
        ]);
      });
    });
  });


  describe('singleError', function() {
    describe('= true', function() {
      it('should generate a single error for all keywords', function() {
        ajvErrors(ajv, {singleError: true});
        testSingleErrors('; ');
      });
    });

    describe('= separator', function() {
      it('should generate a single error for all keywords using separator', function() {
        ajvErrors(ajv, {singleError: '\n'});
        testSingleErrors('\n');
      });
    });

    function testSingleErrors(separator) {
      var schema = {
        type: 'number',
        minimum: 2,
        maximum: 10,
        multipleOf: 2,
        errorMessage: {
          type: 'should be number',
          minimum: 'should be >= 2',
          maximum: 'should be <= 10',
          multipleOf: 'should be multipleOf 2'
        }
      };

      var validate = ajv.compile(schema);
      assert.strictEqual(validate(4), true);
      assert.strictEqual(validate(11), false);

      var expectedKeywords = ['maximum', 'multipleOf'];
      var expectedMessage = expectedKeywords
                            .map(function (keyword) {
                              return schema.errorMessage[keyword];
                            })
                            .join(separator);

      assertErrors(validate, [
        {
          keyword: 'errorMessage',
          message: expectedMessage,
          dataPath: '',
          errors: expectedKeywords
        }
      ]);
    }
  });


  function assertErrors(validate, expectedErrors) {
    assert.strictEqual(validate.errors.length, expectedErrors.length);

    expectedErrors.forEach(function (expectedErr, i) {
      var err = validate.errors[i];
      assert.strictEqual(err.keyword, expectedErr.keyword);
      assert.strictEqual(err.dataPath, expectedErr.dataPath);
      assert.strictEqual(err.emUsed, expectedErr.emUsed);
      if (expectedErr.keyword == 'errorMessage') {
        assert.strictEqual(err.params.errors.length, expectedErr.errors.length);
        expectedErr.errors.forEach(function (matchedKeyword, j) {
          assert.strictEqual(err.params.errors[j].keyword, matchedKeyword);
        });
      }
    });
  }
});
