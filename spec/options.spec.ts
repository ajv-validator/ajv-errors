import ajvErrors from ".."
import Ajv, {ErrorObject, SchemaObject, ValidateFunction} from "ajv"
import assert = require("assert")

function assertErrors(
    validate: ValidateFunction,
    expectedErrors: Partial<ErrorObject & {emUsed: boolean; errors: string[]}>[]
  ): void {
    const {errors} = validate
    assert.strictEqual(errors?.length, expectedErrors.length)

    expectedErrors.forEach((expectedErr, i) => {
      const err = errors[i] as ErrorObject & {emUsed: boolean}
      assert.strictEqual(err.keyword, expectedErr.keyword)
      assert.strictEqual(err.instancePath, expectedErr.instancePath)
      assert.strictEqual(err.emUsed, expectedErr.emUsed)
      if (expectedErr.keyword === "errorMessage") {
        assert.strictEqual(err.params.errors.length, expectedErr.errors?.length)
        expectedErr.errors?.forEach((matchedKeyword: string, j: number) =>
          assert.strictEqual(err.params.errors[j].keyword, matchedKeyword)
        )
      }
    })
  }

describe("options", () => {
    let ajv: Ajv

    beforeEach(() => {
    ajv = new Ajv({allErrors: true})
  })

  describe("keepErrors = true", () => {
    beforeEach(() => ajvErrors(ajv, {keepErrors: true}))

    describe("errorMessage is a string", () => {
      it("should keep matched errors and mark them with {emUsed: true} property", () => {
        const schema = {
          type: "object",
          required: ["foo", "bar"],
          properties: {
            foo: {
              type: "object",
              properties: {
                baz: {
                  type: "integer",
                },
              },
              errorMessage: "should be an object with an integer property baz",
            },
            bar: {
              type: "integer",
            },
          },
        }

        const validate = ajv.compile(schema)
        assert.strictEqual(validate({foo: {baz: 1}, bar: 2}), true)
        assert.strictEqual(validate({foo: 1}), false)

        assertErrors(validate, [
          {
            keyword: "required",
            instancePath: "",
          },
          {
            keyword: "type",
            instancePath: "/foo",
            emUsed: true,
          },
          {
            keyword: "errorMessage",
            message: "should be an object with an integer property baz",
            instancePath: "/foo",
            errors: ["type"],
          },
        ])
      })
    })

    describe("errorMessage is an object with keywords", () => {
      it("should keep matched errors and mark them with {emUsed: true} property", () => {
        const schema = {
          type: "number",
          minimum: 2,
          maximum: 10,
          multipleOf: 2,
          errorMessage: {
            type: "should be number",
            minimum: "should be >= 2",
            maximum: "should be <= 10",
          },
        }

        const validate = ajv.compile(schema)
        assert.strictEqual(validate(4), true)
        assert.strictEqual(validate(11), false)

        assertErrors(validate, [
          {
            keyword: "maximum",
            instancePath: "",
            emUsed: true,
          },
          {
            keyword: "multipleOf",
            instancePath: "",
          },
          {
            keyword: "errorMessage",
            message: "should be <= 10",
            instancePath: "",
            errors: ["maximum"],
          },
        ])
      })
    })

    describe('errorMessage is an object with "required" keyword with properties', () => {
      it("should keep matched errors and mark them with {emUsed: true} property", () => {
        const schema = {
          type: "object",
          required: ["foo", "bar"],
          errorMessage: {
            type: "should be object",
            required: {
              foo: "should have property foo",
              bar: "should have property bar",
            },
          },
        }

        const validate = ajv.compile(schema)
        assert.strictEqual(validate({foo: 1, bar: 2}), true)
        assert.strictEqual(validate({}), false)

        assertErrors(validate, [
          {
            keyword: "required",
            instancePath: "",
            emUsed: true,
          },
          {
            keyword: "required",
            instancePath: "",
            emUsed: true,
          },
          {
            keyword: "errorMessage",
            message: "should have property foo",
            instancePath: "",
            errors: ["required"],
          },
          {
            keyword: "errorMessage",
            message: "should have property bar",
            instancePath: "",
            errors: ["required"],
          },
        ])
      })
    })

    describe("errorMessage is an object with properties/items", () => {
      it("should keep matched errors and mark them with {emUsed: true} property", () => {
        const schema = {
          type: "object",
          properties: {
            foo: {type: "number"},
            bar: {type: "string"},
          },
          errorMessage: {
            properties: {
              foo: "foo should be a number",
            },
          },
        }

        const validate = ajv.compile(schema)
        assert.strictEqual(validate({foo: 1, bar: "a"}), true)
        assert.strictEqual(validate({foo: "a", bar: 1}), false)

        assertErrors(validate, [
          {
            keyword: "type",
            instancePath: "/foo",
            emUsed: true,
          },
          {
            keyword: "type",
            instancePath: "/bar",
          },
          {
            keyword: "errorMessage",
            message: "foo should be a number",
            instancePath: "/foo",
            errors: ["type"],
          },
        ])
      })
    })
  })

  describe("keyword option", () => {
      it("should set the keyword", () => {
	  ajvErrors(ajv, {keyword: 'x-errorMessage'})
	  testKeywordErrors()
      })
      function testKeywordErrors(): void {
	  const errorMessageKeyword = "x-errorMessage"
	  const schema: SchemaObject = {
              type: "number",
              minimum: 2,
              maximum: 10,
              multipleOf: 2,
              [errorMessageKeyword]: {
		  type: "should be number",
		  minimum: "should be >= 2",
		  maximum: "should be <= 10",
		  multipleOf: "should be multipleOf 2",
              },
	  }
	  const validate = ajv.compile(schema)
	  assert.strictEqual(validate(11), false)
	  
	  assertErrors(validate, [
	     {
             "instancePath": "",
             "schemaPath": "#/x-errorMessage",
             "keyword": "x-errorMessage",
             "params": {
		 "errors": [
		     {
			 "instancePath": "",
			 "schemaPath": "#/maximum",
			 "keyword": "maximum",
			 "params": {
			     "comparison": "<=",
			     "limit": 10
			 },
			 "message": "must be <= 10",
			 "emUsed": true
		     }
		 ]
             },
             "message": "should be <= 10"
	     },
	     {
		 "instancePath": "",
		 "schemaPath": "#/x-errorMessage",
		 "keyword": "x-errorMessage",
		 "params": {
		     "errors": [
			 {
			     "instancePath": "",
			     "schemaPath": "#/multipleOf",
			     "keyword": "multipleOf",
			     "params": {
				 "multipleOf": 2
			     },
			     "message": "must be multiple of 2",
			     "emUsed": true
			 }
		     ]
		 },
		 "message": "should be multipleOf 2"
	     }
	  ])
      }
  })
    
  describe("singleError", () => {
    describe("= true", () => {
      it("should generate a single error for all keywords", () => {
        ajvErrors(ajv, {singleError: true})
        testSingleErrors("; ")
      })
    })

    describe("= separator", () => {
      it("should generate a single error for all keywords using separator", () => {
        ajvErrors(ajv, {singleError: "\n"})
        testSingleErrors("\n")
      })
    })

    function testSingleErrors(separator: string): void {
      const schema: SchemaObject = {
        type: "number",
        minimum: 2,
        maximum: 10,
        multipleOf: 2,
        errorMessage: {
          type: "should be number",
          minimum: "should be >= 2",
          maximum: "should be <= 10",
          multipleOf: "should be multipleOf 2",
        },
      }

      const validate = ajv.compile(schema)
      assert.strictEqual(validate(4), true)
      assert.strictEqual(validate(11), false)

      const expectedKeywords = ["maximum", "multipleOf"]
      const expectedMessage = expectedKeywords
        .map((keyword) => schema.errorMessage?.[keyword] as string)
        .join(separator)

      assertErrors(validate, [
        {
          keyword: "errorMessage",
          message: expectedMessage,
          instancePath: "",
          errors: expectedKeywords,
        },
      ])
    }
  })
})
