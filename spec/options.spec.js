'use strict';

const ajvErrors = require('..');
const Ajv = require('ajv').default;
const assert = require('assert');


describe('options', () => {
  let ajv;

  beforeEach(() => {
    ajv = new Ajv({allErrors: true});
  });

  describe('keepErrors = true', () => {
    beforeEach(() => {
      ajvErrors(ajv, {keepErrors: true});
    });

    describe('errorMessage is a string', () => {
      it('should keep matched errors and mark them with {emUsed: true} property', () => {
        const schema = {
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

        const validate = ajv.compile(schema);
        assert.strictEqual(validate({foo: {baz: 1}, bar: 2}), true);
        assert.strictEqual(validate({foo: 1}), false);

        assertErrors(validate, [
          {
            keyword: 'required',
            dataPath: ''
          },
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
        ]);
      });
    });

    describe('errorMessage is an object with keywords', () => {
      it('should keep matched errors and mark them with {emUsed: true} property', () => {
        const schema = {
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

        const validate = ajv.compile(schema);
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

    describe('errorMessage is an object with "required" keyword with properties', () => {
      it('should keep matched errors and mark them with {emUsed: true} property', () => {
        const schema = {
          type: 'object',
          required: ['foo', 'bar'],
          errorMessage: {
            type: 'should be object',
            required: {
              foo: 'should have property foo',
              bar: 'should have property bar',
            }
          }
        };

        const validate = ajv.compile(schema);
        assert.strictEqual(validate({foo: 1, bar: 2}), true);
        assert.strictEqual(validate({}), false);

        assertErrors(validate, [
          {
            keyword: 'required',
            dataPath: '',
            emUsed: true
          },
          {
            keyword: 'required',
            dataPath: '',
            emUsed: true
          },
          {
            keyword: 'errorMessage',
            message: 'should have property foo',
            dataPath: '',
            errors: ['required']
          },
          {
            keyword: 'errorMessage',
            message: 'should have property bar',
            dataPath: '',
            errors: ['required']
          }
        ]);
      });
    });

    describe('errorMessage is an object with properties/items', () => {
      it('should keep matched errors and mark them with {emUsed: true} property', () => {
        const schema = {
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

        const validate = ajv.compile(schema);
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


  describe('singleError', () => {
    describe('= true', () => {
      it('should generate a single error for all keywords', () => {
        ajvErrors(ajv, {singleError: true});
        testSingleErrors('; ');
      });
    });

    describe('= separator', () => {
      it('should generate a single error for all keywords using separator', () => {
        ajvErrors(ajv, {singleError: '\n'});
        testSingleErrors('\n');
      });
    });

    function testSingleErrors(separator) {
      const schema = {
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

      const validate = ajv.compile(schema);
      assert.strictEqual(validate(4), true);
      assert.strictEqual(validate(11), false);

      const expectedKeywords = ['maximum', 'multipleOf'];
      const expectedMessage = expectedKeywords
                            .map((keyword) => {
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

    expectedErrors.forEach((expectedErr, i) => {
      const err = validate.errors[i];
      assert.strictEqual(err.keyword, expectedErr.keyword);
      assert.strictEqual(err.dataPath, expectedErr.dataPath);
      assert.strictEqual(err.emUsed, expectedErr.emUsed);
      if (expectedErr.keyword === 'errorMessage') {
        assert.strictEqual(err.params.errors.length, expectedErr.errors.length);
        expectedErr.errors.forEach((matchedKeyword, j) => {
          assert.strictEqual(err.params.errors[j].keyword, matchedKeyword);
        });
      }
    });
  }
});
