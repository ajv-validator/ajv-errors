# ajv-errors

Custom error messages in JSON-Schema for Ajv validator

[![build](https://github.com/ajv-validator/ajv-errors/workflows/build/badge.svg)](https://github.com/ajv-validator/ajv-errors/actions?query=workflow%3Abuild)
[![npm](https://img.shields.io/npm/v/ajv-errors.svg)](https://www.npmjs.com/package/ajv-errors)
[![coverage](https://coveralls.io/repos/github/ajv-validator/ajv-errors/badge.svg?branch=master)](https://coveralls.io/github/ajv-validator/ajv-errors?branch=master)
[![gitter](https://img.shields.io/gitter/room/ajv-validator/ajv.svg)](https://gitter.im/ajv-validator/ajv)

**Please note**

ajv-errors v3 supports [ajv v8](https://github.com/ajv-validator/ajv).

If you are using ajv v6, you should use [ajv-errors v1](https://github.com/ajv-validator/ajv-errors/tree/v1)

## Contents

- [Install](#install)
- [Usage](#usage)
  - [Single message](#single-message)
  - [Messages for keywords](#messages-for-keywords)
  - [Messages for properties and items](#messages-for-properties-and-items)
  - [Default message](#default-message)
- [Templates](#templates)
- [Options](#options)
- [Supporters, Enterprise support, Security contact](#supporters)
- [License](#license)

## Install

```
npm install ajv-errors
```

## Usage

Add the keyword `errorMessages` to Ajv instance:

```javascript
const Ajv = require("ajv").default
const ajv = new Ajv({allErrors: true})
// Ajv option allErrors is required
require("ajv-errors")(ajv /*, {singleError: true} */)
```

See [Options](#options) below.

### Single message

Replace all errors in the current schema and subschemas with a single message:

```javascript
const schema = {
  type: "object",
  required: ["foo"],
  properties: {
    foo: {type: "integer"},
  },
  additionalProperties: false,
  errorMessage: "should be an object with an integer property foo only",
}

const validate = ajv.compile(schema)
console.log(validate({foo: "a", bar: 2})) // false
console.log(validate.errors) // processed errors
```

Processed errors:

```json5
[
  {
    keyword: "errorMessage",
    message: "should be an object with an integer property foo only",
    // ...
    params: {
      errors: [
        {keyword: "additionalProperties", instancePath: "" /* , ... */},
        {keyword: "type", instancePath: ".foo" /* , ... */},
      ],
    },
  },
]
```

### Messages for keywords

Replace errors for certain keywords in the current schema only:

```javascript
const schema = {
  type: "object",
  required: ["foo"],
  properties: {
    foo: {type: "integer"},
  },
  additionalProperties: false,
  errorMessage: {
    type: "should be an object", // will not replace internal "type" error for the property "foo"
    required: "should have property foo",
    additionalProperties: "should not have properties other than foo",
  },
}

const validate = ajv.compile(schema)
console.log(validate({foo: "a", bar: 2})) // false
console.log(validate.errors) // processed errors
```

Processed errors:

```json5
[
  {
    // original error
    keyword: type,
    instancePath: "/foo",
    // ...
    message: "should be integer",
  },
  {
    // generated error
    keyword: "errorMessage",
    message: "should not have properties other than foo",
    // ...
    params: {
      errors: [{keyword: "additionalProperties" /* , ... */}],
    },
  },
]
```

For keywords "required" and "dependencies" it is possible to specify different messages for different properties:

```javascript
const schema = {
  type: "object",
  required: ["foo", "bar"],
  properties: {
    foo: {type: "integer"},
    bar: {type: "string"},
  },
  errorMessage: {
    type: "should be an object", // will not replace internal "type" error for the property "foo"
    required: {
      foo: 'should have an integer property "foo"',
      bar: 'should have a string property "bar"',
    },
  },
}
```

### Messages for properties and items

Replace errors for properties / items (and deeper), regardless where in schema they were created:

```javascript
const schema = {
  type: "object",
  required: ["foo", "bar"],
  allOf: [
    {
      properties: {
        foo: {type: "integer", minimum: 2},
        bar: {type: "string", minLength: 2},
      },
      additionalProperties: false,
    },
  ],
  errorMessage: {
    properties: {
      foo: "data.foo should be integer >= 2",
      bar: "data.bar should be string with length >= 2",
    },
  },
}

const validate = ajv.compile(schema)
console.log(validate({foo: 1, bar: "a"})) // false
console.log(validate.errors) // processed errors
```

Processed errors:

```json5
[
  {
    keyword: "errorMessage",
    message: "data.foo should be integer >= 2",
    instancePath: "/foo",
    // ...
    params: {
      errors: [{keyword: "minimum" /* , ... */}],
    },
  },
  {
    keyword: "errorMessage",
    message: "data.bar should be string with length >= 2",
    instancePath: "/bar",
    // ...
    params: {
      errors: [{keyword: "minLength" /* , ... */}],
    },
  },
]
```

### Default message

When the value of keyword `errorMessage` is an object you can specify a message that will be used if any error appears that is not specified by keywords/properties/items using `_` property:

```javascript
const schema = {
  type: "object",
  required: ["foo", "bar"],
  allOf: [
    {
      properties: {
        foo: {type: "integer", minimum: 2},
        bar: {type: "string", minLength: 2},
      },
      additionalProperties: false,
    },
  ],
  errorMessage: {
    type: "data should be an object",
    properties: {
      foo: "data.foo should be integer >= 2",
      bar: "data.bar should be string with length >= 2",
    },
    _: 'data should have properties "foo" and "bar" only',
  },
}

const validate = ajv.compile(schema)
console.log(validate({})) // false
console.log(validate.errors) // processed errors
```

Processed errors:

```json5
[
  {
    keyword: "errorMessage",
    message: 'data should be an object with properties "foo" and "bar" only',
    instancePath: "",
    // ...
    params: {
      errors: [{keyword: "required" /* , ... */}, {keyword: "required" /* , ... */}],
    },
  },
]
```

The message in property `_` of `errorMessage` replaces the same errors that would have been replaced if `errorMessage` were a string.

## Templates

Custom error messages used in `errorMessage` keyword can be templates using [JSON-pointers](https://tools.ietf.org/html/rfc6901) or [relative JSON-pointers](http://tools.ietf.org/html/draft-luff-relative-json-pointer-00) to data being validated, in which case the value will be interpolated. Also see [examples](https://gist.github.com/geraintluff/5911303) of relative JSON-pointers.

The syntax to interpolate a value is `${<pointer>}`.

The values used in messages will be JSON-stringified:

- to differentiate between `false` and `"false"`, etc.
- to support structured values.

Example:

```javascript
const schema = {
  type: "object",
  properties: {
    size: {
      type: "number",
      minimum: 4,
    },
  },
  errorMessage: {
    properties: {
      size: "size should be a number bigger or equal to 4, current value is ${/size}",
    },
  },
}
```

#### Using property names in error messages

Property names can be used in error messages with the relative JSON-pointer (e.g. `0#`). 

Example: 
```javascript
const schema = {
  type: "object",
  properties: {
    size: {
      type: "number",
    },
  },
  additionalProperties: {
    not: true,
    errorMessage: “extra property is ${0#}”
  }
}
```

## Options

Defaults:

```json5
{
  keepErrors: false,
  singleError: false,
}
```

- _keepErrors_: keep original errors. Default is to remove matched errors (they will still be available in `params.errors` property of generated error). If an error was matched and included in the error generated by `errorMessage` keyword it will have property `emUsed: true`.
- _singleError_: create one error for all keywords used in `errorMessage` keyword (error messages defined for properties and items are not merged because they have different instancePaths). Multiple error messages are concatenated. Option values:
  - `false` (default): create multiple errors, one for each message
  - `true`: create single error, messages are concatenated using `"; "`
  - non-empty string: this string is used as a separator to concatenate messages

## Supporters

[Roger Kepler](https://www.linkedin.com/in/rogerkepler/)

## Enterprise support

ajv-errors package is a part of [Tidelift enterprise subscription](https://tidelift.com/subscription/pkg/npm-ajv-errors?utm_source=npm-ajv-errors&utm_medium=referral&utm_campaign=enterprise&utm_term=repo) - it provides a centralised commercial support to open-source software users, in addition to the support provided by software maintainers.

## Security contact

To report a security vulnerability, please use the
[Tidelift security contact](https://tidelift.com/security).
Tidelift will coordinate the fix and disclosure. Please do NOT report security vulnerability via GitHub issues.

## License

[MIT](https://github.com/epoberezkin/ajv-errors/blob/master/LICENSE)
