import type {Plugin, CodeKeywordDefinition, KeywordCxt, ErrorObject, Code} from "ajv"
import Ajv, {_, str, stringify, Name} from "ajv"
import {and, or, not, strConcat} from "ajv/dist/compile/codegen"
import {safeStringify, _Code} from "ajv/dist/compile/codegen/code"
import {getData} from "ajv/dist/compile/validate"
import {reportError} from "ajv/dist/compile/errors"
import N from "ajv/dist/compile/names"

type ErrorsMap<T extends string | number> = {[P in T]?: ErrorObject[]}

type StringMap = {[P in string]?: string}

type ErrorMessageSchema = {
  properties?: StringMap
  items?: string[]
  required?: string | StringMap
  dependencies?: string | StringMap
  _?: string
} & {[K in string]?: string | StringMap}

interface ChildErrors {
  props?: ErrorsMap<string>
  items?: ErrorsMap<number>
}

const keyword = "errorMessage"

const used: Name = new Name("emUsed")

const KEYWORD_PROPERTY_PARAMS = {
  required: "missingProperty",
  dependencies: "property",
  dependentRequired: "property",
}

export interface ErrorMessageOptions {
  keepErrors?: boolean
  singleError?: boolean | string
}

const INTERPOLATION = /\$\{[^}]+\}/
const INTERPOLATION_REPLACE = /\$\{([^}]+)\}/g
const EMPTY_STR = /^""\s*\+\s*|\s*\+\s*""$/g

function errorMessage(options: ErrorMessageOptions): CodeKeywordDefinition {
  return {
    keyword,
    schemaType: ["string", "object"],
    post: true,
    code(cxt: KeywordCxt) {
      const {gen, data, schema, schemaValue, it} = cxt
      if (it.createErrors === false) return
      const sch: ErrorMessageSchema | string = schema
      const instancePath = strConcat(N.instancePath, it.errorPath)
      gen.if(_`${N.errors} > 0`, () => {
        if (typeof sch == "object") {
          const [kwdPropErrors, kwdErrors] = keywordErrorsConfig(sch)
          if (kwdErrors) processKeywordErrors(kwdErrors)
          if (kwdPropErrors) processKeywordPropErrors(kwdPropErrors)
          processChildErrors(childErrorsConfig(sch))
        }
        const schMessage = typeof sch == "string" ? sch : sch._
        if (schMessage) processAllErrors(schMessage)
        if (!options.keepErrors) removeUsedErrors()
      })

      function childErrorsConfig({properties, items}: ErrorMessageSchema): ChildErrors {
        const errors: ChildErrors = {}
        if (properties) {
          errors.props = {}
          for (const p in properties) errors.props[p] = []
        }
        if (items) {
          errors.items = {}
          for (let i = 0; i < items.length; i++) errors.items[i] = []
        }
        return errors
      }

      function keywordErrorsConfig(
        emSchema: ErrorMessageSchema
      ): [{[K in string]?: ErrorsMap<string>} | undefined, ErrorsMap<string> | undefined] {
        let propErrors: {[K in string]?: ErrorsMap<string>} | undefined
        let errors: ErrorsMap<string> | undefined

        for (const k in emSchema) {
          if (k === "properties" || k === "items") continue
          const kwdSch = emSchema[k]
          if (typeof kwdSch == "object") {
            propErrors ||= {}
            const errMap: ErrorsMap<string> = (propErrors[k] = {})
            for (const p in kwdSch) errMap[p] = []
          } else {
            errors ||= {}
            errors[k] = []
          }
        }
        return [propErrors, errors]
      }

      function processKeywordErrors(kwdErrors: ErrorsMap<string>): void {
        const kwdErrs = gen.const("emErrors", stringify(kwdErrors))
        const templates = gen.const("templates", getTemplatesCode(kwdErrors, schema))
        gen.forOf("err", N.vErrors, (err) =>
          gen.if(matchKeywordError(err, kwdErrs), () =>
            gen.code(_`${kwdErrs}[${err}.keyword].push(${err})`).assign(_`${err}.${used}`, true)
          )
        )
        const {singleError} = options
        if (singleError) {
          const message = gen.let("message", _`""`)
          const paramsErrors = gen.let("paramsErrors", _`[]`)
          loopErrors((key) => {
            gen.if(message, () =>
              gen.code(_`${message} += ${typeof singleError == "string" ? singleError : ";"}`)
            )
            gen.code(_`${message} += ${errMessage(key)}`)
            gen.assign(paramsErrors, _`${paramsErrors}.concat(${kwdErrs}[${key}])`)
          })
          reportError(cxt, {message, params: _`{errors: ${paramsErrors}}`})
        } else {
          loopErrors((key) =>
            reportError(cxt, {
              message: errMessage(key),
              params: _`{errors: ${kwdErrs}[${key}]}`,
            })
          )
        }

        function loopErrors(body: (key: Name) => void): void {
          gen.forIn("key", kwdErrs, (key) => gen.if(_`${kwdErrs}[${key}].length`, () => body(key)))
        }

        function errMessage(key: Name): Code {
          return _`${key} in ${templates} ? ${templates}[${key}]() : ${schemaValue}[${key}]`
        }
      }

      function processKeywordPropErrors(kwdPropErrors: {[K in string]?: ErrorsMap<string>}): void {
        const kwdErrs = gen.const("emErrors", stringify(kwdPropErrors))
        const templatesCode: [string, Code][] = []
        for (const k in kwdPropErrors) {
          templatesCode.push([
            k,
            getTemplatesCode(kwdPropErrors[k] as ErrorsMap<string>, schema[k]),
          ])
        }
        const templates = gen.const("templates", gen.object(...templatesCode))

        const kwdPropParams = gen.scopeValue("obj", {
          ref: KEYWORD_PROPERTY_PARAMS,
          code: stringify(KEYWORD_PROPERTY_PARAMS),
        })
        const propParam = gen.let("emPropParams")
        const paramsErrors = gen.let("emParamsErrors")

        gen.forOf("err", N.vErrors, (err) =>
          gen.if(matchKeywordError(err, kwdErrs), () => {
            gen.assign(propParam, _`${kwdPropParams}[${err}.keyword]`)
            gen.assign(paramsErrors, _`${kwdErrs}[${err}.keyword][${err}.params[${propParam}]]`)
            gen.if(paramsErrors, () =>
              gen.code(_`${paramsErrors}.push(${err})`).assign(_`${err}.${used}`, true)
            )
          })
        )

        gen.forIn("key", kwdErrs, (key) =>
          gen.forIn("keyProp", _`${kwdErrs}[${key}]`, (keyProp) => {
            gen.assign(paramsErrors, _`${kwdErrs}[${key}][${keyProp}]`)
            gen.if(_`${paramsErrors}.length`, () => {
              const tmpl = gen.const(
                "tmpl",
                _`${templates}[${key}] && ${templates}[${key}][${keyProp}]`
              )
              reportError(cxt, {
                message: _`${tmpl} ? ${tmpl}() : ${schemaValue}[${key}][${keyProp}]`,
                params: _`{errors: ${paramsErrors}}`,
              })
            })
          })
        )
      }

      function processChildErrors(childErrors: ChildErrors): void {
        const {props, items} = childErrors
        if (!props && !items) return
        const isObj = _`typeof ${data} == "object"`
        const isArr = _`Array.isArray(${data})`
        const childErrs = gen.let("emErrors")
        let childKwd: Name
        let childProp: Code
        const templates = gen.let("templates")
        if (props && items) {
          childKwd = gen.let("emChildKwd")
          gen.if(isObj)
          gen.if(
            isArr,
            () => {
              init(items, schema.items)
              gen.assign(childKwd, str`items`)
            },
            () => {
              init(props, schema.properties)
              gen.assign(childKwd, str`properties`)
            }
          )
          childProp = _`[${childKwd}]`
        } else if (items) {
          gen.if(isArr)
          init(items, schema.items)
          childProp = _`.items`
        } else if (props) {
          gen.if(and(isObj, not(isArr)))
          init(props, schema.properties)
          childProp = _`.properties`
        }

        gen.forOf("err", N.vErrors, (err) =>
          ifMatchesChildError(err, childErrs, (child) =>
            gen.code(_`${childErrs}[${child}].push(${err})`).assign(_`${err}.${used}`, true)
          )
        )

        gen.forIn("key", childErrs, (key) =>
          gen.if(_`${childErrs}[${key}].length`, () => {
            reportError(cxt, {
              message: _`${key} in ${templates} ? ${templates}[${key}]() : ${schemaValue}${childProp}[${key}]`,
              params: _`{errors: ${childErrs}[${key}]}`,
            })
            gen.assign(
              _`${N.vErrors}[${N.errors}-1].instancePath`,
              _`${instancePath} + "/" + ${key}.replace(/~/g, "~0").replace(/\\//g, "~1")`
            )
          })
        )

        gen.endIf()

        function init<T extends string | number>(
          children: ErrorsMap<T>,
          msgs: {[K in string]?: string}
        ): void {
          gen.assign(childErrs, stringify(children))
          gen.assign(templates, getTemplatesCode(children, msgs))
        }
      }

      function processAllErrors(schMessage: string): void {
        const errs = gen.const("emErrs", _`[]`)
        gen.forOf("err", N.vErrors, (err) =>
          gen.if(matchAnyError(err), () =>
            gen.code(_`${errs}.push(${err})`).assign(_`${err}.${used}`, true)
          )
        )
        gen.if(_`${errs}.length`, () =>
          reportError(cxt, {
            message: templateExpr(schMessage),
            params: _`{errors: ${errs}}`,
          })
        )
      }

      function removeUsedErrors(): void {
        const errs = gen.const("emErrs", _`[]`)
        gen.forOf("err", N.vErrors, (err) =>
          gen.if(_`!${err}.${used}`, () => gen.code(_`${errs}.push(${err})`))
        )
        gen.assign(N.vErrors, errs).assign(N.errors, _`${errs}.length`)
      }

      function matchKeywordError(err: Name, kwdErrs: Name): Code {
        return and(
          _`${err}.keyword !== ${keyword}`,
          _`!${err}.${used}`,
          _`${err}.instancePath === ${instancePath}`,
          _`${err}.keyword in ${kwdErrs}`,
          // TODO match the end of the string?
          _`${err}.schemaPath.indexOf(${it.errSchemaPath}) === 0`,
          _`/^\\/[^\\/]*$/.test(${err}.schemaPath.slice(${it.errSchemaPath.length}))`
        )
      }

      function ifMatchesChildError(
        err: Name,
        childErrs: Name,
        thenBody: (child: Name) => void
      ): void {
        gen.if(
          and(
            _`${err}.keyword !== ${keyword}`,
            _`!${err}.${used}`,
            _`${err}.instancePath.indexOf(${instancePath}) === 0`
          ),
          () => {
            const childRegex = gen.scopeValue("pattern", {
              ref: /^\/([^/]*)(?:\/|$)/,
              code: _`new RegExp("^\\\/([^/]*)(?:\\\/|$)")`,
            })
            const matches = gen.const(
              "emMatches",
              _`${childRegex}.exec(${err}.instancePath.slice(${instancePath}.length))`
            )
            const child = gen.const(
              "emChild",
              _`${matches} && ${matches}[1].replace(/~1/g, "/").replace(/~0/g, "~")`
            )
            gen.if(_`${child} !== undefined && ${child} in ${childErrs}`, () => thenBody(child))
          }
        )
      }

      function matchAnyError(err: Name): Code {
        return and(
          _`${err}.keyword !== ${keyword}`,
          _`!${err}.${used}`,
          or(
            _`${err}.instancePath === ${instancePath}`,
            and(
              _`${err}.instancePath.indexOf(${instancePath}) === 0`,
              _`${err}.instancePath[${instancePath}.length] === "/"`
            )
          ),
          _`${err}.schemaPath.indexOf(${it.errSchemaPath}) === 0`,
          _`${err}.schemaPath[${it.errSchemaPath}.length] === "/"`
        )
      }

      function getTemplatesCode(keys: Record<string, any>, msgs: {[K in string]?: string}): Code {
        const templatesCode: [string, Code][] = []
        for (const k in keys) {
          const msg = msgs[k] as string
          if (INTERPOLATION.test(msg)) templatesCode.push([k, templateFunc(msg)])
        }
        return gen.object(...templatesCode)
      }

      function templateExpr(msg: string): Code {
        if (!INTERPOLATION.test(msg)) return stringify(msg)
        return new _Code(
          safeStringify(msg)
            .replace(
              INTERPOLATION_REPLACE,
              (_s, ptr) => `" + JSON.stringify(${getData(ptr, it)}) + "`
            )
            .replace(EMPTY_STR, "")
        )
      }

      function templateFunc(msg: string): Code {
        return _`function(){return ${templateExpr(msg)}}`
      }
    },
    metaSchema: {
      anyOf: [
        {type: "string"},
        {
          type: "object",
          properties: {
            properties: {$ref: "#/$defs/stringMap"},
            items: {$ref: "#/$defs/stringList"},
            required: {$ref: "#/$defs/stringOrMap"},
            dependencies: {$ref: "#/$defs/stringOrMap"},
          },
          additionalProperties: {type: "string"},
        },
      ],
      $defs: {
        stringMap: {
          type: "object",
          additionalProperties: {type: "string"},
        },
        stringOrMap: {
          anyOf: [{type: "string"}, {$ref: "#/$defs/stringMap"}],
        },
        stringList: {type: "array", items: {type: "string"}},
      },
    },
  }
}

const ajvErrors: Plugin<ErrorMessageOptions> = (
  ajv: Ajv,
  options: ErrorMessageOptions = {}
): Ajv => {
  if (!ajv.opts.allErrors) throw new Error("ajv-errors: Ajv option allErrors must be true")
  if (ajv.opts.jsPropertySyntax) {
    throw new Error("ajv-errors: ajv option jsPropertySyntax is not supported")
  }
  return ajv.addKeyword(errorMessage(options))
}

export default ajvErrors
module.exports = ajvErrors
module.exports.default = ajvErrors
