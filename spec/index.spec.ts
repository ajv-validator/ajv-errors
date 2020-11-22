import ajvErrors from ".."
import Ajv from "ajv"
import assert = require("assert")

describe("ajv-errors", () => {
  it("should return ajv instance", () => {
    const ajv = new Ajv({allErrors: true})
    assert.strictEqual(ajvErrors(ajv), ajv)
  })

  it("should throw if option allErrors is not set", () => assert.throws(() => ajvErrors(new Ajv())))

  it("should throw if option jsPropertySyntax is set", () => {
    const ajv = new Ajv({allErrors: true, jsPropertySyntax: true, logger: false})
    assert.throws(() => ajvErrors(ajv))
  })
})
