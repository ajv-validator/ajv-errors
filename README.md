# ajv-errors
Custom error messages in JSON-Schema for Ajv validator

[![Build Status](https://travis-ci.org/epoberezkin/ajv-errors.svg?branch=master)](https://travis-ci.org/epoberezkin/ajv-errors)
[![npm version](https://badge.fury.io/js/ajv-errors.svg)](http://badge.fury.io/js/ajv-errors)
[![Coverage Status](https://coveralls.io/repos/github/epoberezkin/ajv-errors/badge.svg?branch=master)](https://coveralls.io/github/epoberezkin/ajv-errors?branch=master)
[![Gitter](https://img.shields.io/gitter/room/ajv-validator/ajv.svg)](https://gitter.im/ajv-validator/ajv)


## Install

```
npm install ajv-errors
```


## Usage

Add the keyword `errorMessages` to Ajv instance:

```javascript
var Ajv = require('ajv');
var ajv = new Ajv({allErrors: true}); // option allErrors is required
require('ajv-errors')(ajv);
```

#### Replace all errors in the current schema and subschemas with a single message:

```javascript
var schema = {
  type: 'object',
  required: ['foo'],
  properties: {
    foo: { type: 'integer' }
  },
  additionalProperties: false,
  errorMessage: 'should be an object with an integer property foo only'
};

var validate = ajv.compile(schema);
console.log(validate({foo: 'a', bar: 2})); // false
console.log(validate.errors); // processed errors
```

Processed errors:

```javascript
[
  {
    keyword: 'errorMessage',
    message: 'should be an object with an integer property foo only',
    // ...
    params: {
      errors: [
        { keyword: 'additionalProperties', dataPath: '' /* , ... */ },
        { keyword: 'type', dataPath: '.foo' /* , ... */ }
      ]
    }
  }
]
```

#### Replace errors for certain keywords in the current schema only:

```javascript
var schema = {
  type: 'object',
  required: ['foo'],
  properties: {
    foo: { type: 'integer' }
  },
  additionalProperties: false,
  errorMessage: {
    type: 'should be an object', // will not replace internal "type" error for the property "foo"
    required: 'should have property foo',
    additionalProperties: 'should not have properties other than foo'
  }
};

var validate = ajv.compile(schema);
console.log(validate({foo: 'a', bar: 2})); // false
console.log(validate.errors); // processed errors
```

Processed errors:

```javascript
[
  {
    // original error
    keyword: type,
    dataPath: '.foo',
    // ...
    message: 'should be integer'
  },
  {
    // generated error
    keyword: 'errorMessage',
    message: 'should not have properties other than foo',
    // ...
    params: {
      errors: [
        { keyword: 'additionalProperties' /* , ... */ }
      ]
    },
  }
]
```


## License

[MIT](https://github.com/epoberezkin/ajv-errors/blob/master/LICENSE)
