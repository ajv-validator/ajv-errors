import ajvErrors from ".."
import Ajv, {ErrorObject} from "ajv"
import assert = require("assert")

describe("errorMessage value is a string", () => {
  it("should replace all errors with custom error message", () => {
    const ajvs = [
      ajvErrors(new Ajv({allErrors: true})),
      ajvErrors(new Ajv({allErrors: true, verbose: true})),
    ]

    const schema = {
      type: "object",
      required: ["foo"],
      properties: {
        foo: {type: "integer"},
      },
      additionalProperties: false,
      errorMessage: "should be an object with an integer property foo only",
    }

    ajvs.forEach((ajv) => {
      const validate = ajv.compile(schema)
      assert.strictEqual(validate({foo: 1}), true)
      testInvalid({}, ["required"])
      testInvalid({bar: 2}, ["required", "additionalProperties"])
      testInvalid({foo: 1, bar: 2}, ["additionalProperties"])
      testInvalid({foo: "a"}, ["type"])
      testInvalid({foo: "a", bar: 2}, ["type", "additionalProperties"])
      testInvalid(1, ["type"])

      function testInvalid(data: any, expectedReplacedKeywords: string[]): void {
        assert.strictEqual(validate(data), false)
        assert.strictEqual(validate.errors?.length, 1)
        const err = validate.errors[0]
        assert.strictEqual(err.keyword, "errorMessage")
        assert.strictEqual(err.message, schema.errorMessage)
        assert.strictEqual(err.dataPath, "")
        assert.strictEqual(err.schemaPath, "#/errorMessage")
        const replacedKeywords = err.params.errors.map((e: ErrorObject) => {
          return e.keyword
        })
        assert.deepStrictEqual(replacedKeywords.sort(), expectedReplacedKeywords.sort())
      }
    })
  })

  it("should replace all errors with interpolated error message", () => {
    const ajvs = [
      ajvErrors(new Ajv({allErrors: true})),
      ajvErrors(new Ajv({allErrors: true, verbose: true})),
    ]

    const errorMessages = [
      'properties "foo" = ${/foo}, "bar" = ${/bar}, should be integer',
      '${/foo}, ${/bar} are the values of properties "foo", "bar", should be integer',
      'properties "foo", "bar" should be integer, they are ${/foo}, ${/bar}',
    ]

    let schema = {
      type: "object",
      properties: {
        foo: {type: "integer"},
        bar: {type: "integer"},
      },
      errorMessage: "will be replaced with one of the messages above",
    }

    errorMessages.forEach((message) => {
      ajvs.forEach((ajv) => {
        schema = JSON.parse(JSON.stringify(schema))
        schema.errorMessage = message
        const validate = ajv.compile(schema)
        assert.strictEqual(validate({foo: 1}), true)
        testInvalid({foo: 1.2, bar: 2.3}, ["type", "type"])
        testInvalid({foo: "a", bar: "b"}, ["type", "type"])
        testInvalid({foo: false, bar: true}, ["type", "type"])

        function testInvalid(data: any, expectedReplacedKeywords: string[]): void {
          assert.strictEqual(validate(data), false)
          assert.strictEqual(validate.errors?.length, 1)
          const err = validate.errors[0]
          assert.strictEqual(err.keyword, "errorMessage")
          const expectedMessage = schema.errorMessage
            .replace("${/foo}", JSON.stringify(data.foo))
            .replace("${/bar}", JSON.stringify(data.bar))
          assert.strictEqual(err.message, expectedMessage)
          assert.strictEqual(err.dataPath, "")
          assert.strictEqual(err.schemaPath, "#/errorMessage")
          const replacedKeywords = err.params.errors.map((e: ErrorObject) => e.keyword)
          assert.deepStrictEqual(replacedKeywords.sort(), expectedReplacedKeywords.sort())
        }
      })
    })
  })
})
