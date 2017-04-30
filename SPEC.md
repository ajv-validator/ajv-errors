

## Usage

Schema:

```json
{
  "type": "object",
  "properties": {
    "size": {
      "type": "number",
      "minimum": 4,
      "multipleOf": 2,
      "errorMessage": {
        "type": "size should be a number",
        "minimum": "size should be bigger or equal to 4",
        "multipleOf": "size should be even"
      }
    }
  },
  "required": ["size"],
  "errorMessage": {
    "required": {
      "size": "size is mandatory"
    }
  }
}
```


Missing required property

```javascript
var Ajv = require('ajv');
var ajv = new Ajv({allErrors: true});
require('ajv-errors')(ajv, {mode: 'replace', separator: '; '});
ajv.validate(schema, {});
console.log(ajv.errors);
// [{
//   keyword: 'errorMessage',
//   message: '...',
//   errorMessage: 'size is mandatory',
//   dataPath: '',
//   params: { keywords: ['required'], errors: [/* replaced errors */] }
//   ...
// }]
```


Invalid property value

```javascript
var Ajv = require('ajv');
var ajv = new Ajv({allErrors: true});
require('ajv-errors')(ajv, {mode: 'replace', separator: '; '});
ajv.validate(schema, { size: 3 });
console.log(ajv.errors);
// [{
//   keyword: 'errorMessage',
//   message: '...',
//   errorMessage: 'size should be bigger or equal to 4; size should be even',
//   dataPath: '.size',
//   params: { keywords: ['minimum', 'multipleOf'], errors: [/* replaced errors */] }
//   ...
// }]
```


## Possible keyword values

- string - process all errors at the current schema & data level or deeper. // DONE
- object - keys are considered keywords.
  - if the value is a string, process all keyword-specific errors at the current schema & data level // DONE
  - if the value is an object, keys are considered property names (or property patterns in case of "patternProperties" keyword). This syntax can be used with keywords having multiple subschemas one for each property and with required keyword as well. In this case process all keyword-specific errors at the current schema & data level for a given property (or property matching pattern. Note, that patterns here MUST be the same as patterns used in "patternProperties" keyword). // TODO
  - if the value is an array, each item is considered an error message for a subschema at the same index. This syntax can be used with keywords that have arrays as their values, including "required". // TODO

Limitation - it is not possible to define error messages for $ref keyword.


## Templates // TODO

Error messages used in errorMessage keyword can be templates using relative or absolute JSON pointers to data being validated, in which case the value will be interpolated. Primitive values (string, number, boolean, null) will be interpolated as is, structured values (array, object) will interpolated stable-stringified. Possibly, there can be a hook defined in options passed to `require('ajv-errors')` call to process interpolated values.

Example:

```
"size should be bigger or equal to 4, current value is ${/size}"
```


## Processing errors

All errors that "errorMessage" keyword processes determined by keyword value, as described above.

Each appearance of "errorMessage" keyword can generate either multiple or a single error message, depending on the option "multiple" (true/false, default is false?).  // DONE only multiple errors, probably single not needed?

If a single message is generated, option "separator" (a string, default is ', ' - same as in errorsText method) defines how to join multiple messages into a single string. // TODO?

Option "prefix" can be used to prepend error message with "property" name or "dataPath"? // TODO?

Option "mode" determines whether the errors are replaced by "errorMessage" errors or they are kept ("replace"/"append", default is "append"?). // TODO? only replace is done currently
