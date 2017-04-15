'use strict';
module.exports = function generate_errorMessage(it, $keyword, $ruleType) {
  var out = ' ';
  var $lvl = it.level;
  var $dataLvl = it.dataLevel;
  var $schema = it.schema[$keyword];
  var $errSchemaPath = it.errSchemaPath + '/' + $keyword;
  var $breakOnError = !it.opts.allErrors;
  var $data = 'data' + ($dataLvl || '');
  if (it.createErrors !== false) {
    out += ' if (errors > 0) { ';
    var $rule = this,
      $dataPath = 'errorMessage_dataPath' + $lvl,
      $i = 'errorMessage_i' + $lvl,
      $err = 'errorMessage_err' + $lvl,
      $errors = 'errorMessage_errors' + $lvl,
      $errSchemaPathString = it.util.toQuotedString(it.errSchemaPath);
    out += ' var ' + ($dataPath) + ' = (dataPath || \'\') + ' + (it.errorPath) + '; ';
    if (typeof $schema == 'string') {
      out += ' var ' + ($i) + ' = 0; var ' + ($err) + '; var ' + ($errors) + ' = undefined; while (' + ($i) + '<errors) { ' + ($err) + ' = vErrors[' + ($i) + ']; if (' + ($err) + '.keyword != \'' + ($keyword) + '\' && ' + ($err) + '.dataPath == ' + ($dataPath) + ' && ' + ($err) + '.schemaPath.indexOf(' + ($errSchemaPathString) + ') == 0 && ' + ($err) + '.schemaPath[' + (it.errSchemaPath.length) + '] == \'/\') { if (' + ($errors) + ') ' + ($errors) + '.push(' + ($err) + '); else ' + ($errors) + ' = [' + ($err) + ']; vErrors.splice(' + ($i) + ', 1); errors--; } else { ' + ($i) + '++; } } if (' + ($errors) + ') { var err =     { keyword: \'' + ($keyword) + '\' , dataPath: ' + ($dataPath) + ' , schemaPath: ' + ($errSchemaPathString) + ' , params: { errors: ' + ($errors) + ' } ';
      if (it.opts.messages !== false) {
        out += ' , message: ' + (it.util.toQuotedString($schema)) + ' ';
      }
      if (it.opts.verbose) {
        out += ' , schema: ' + (it.util.toQuotedString($schema)) + ' , parentSchema: validate.schema' + (it.schemaPath) + ' , data: ' + ($data) + ' ';
      }
      out += ' };  if (vErrors === null) vErrors = [err]; else vErrors.push(err); errors++; } ';
    }
    out += ' }';
  }
  return out;
}
