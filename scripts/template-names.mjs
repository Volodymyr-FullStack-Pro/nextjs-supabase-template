import { readFileSync } from 'node:fs'

const NOT_CODE =
  /\/\/[^\n]*|\/\*[\s\S]*?\*\/|'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`/gu
const NAME = /[A-Za-z_$][\w$]*/u
const DECLARED = /\b(?:const|let|var|function|class|type|interface|enum)\s+([A-Za-z_$][\w$]*)/gu
const DESTRUCTURED = /\b(?:const|let|var)\s*[{[]([^=]*?)[}\]]\s*(?::[^=]+)?=/gu
const IMPORTED = /\bimport\s+(?:type\s+)?([^'";]*?)\s+from\b/gu
const GENERIC_TYPE = /(?<![\w$.])([A-Z][\w$]*)</gu
const TYPESCRIPT_FILE = /\.tsx?$/u

const localNames = (list) =>
  list
    .split(',')
    .map((part) => {
      const local =
        part
          .trim()
          .split(/\s+as\s+|:\s*/u)
          .at(-1) ?? ''
      return NAME.exec(local.replace(/^(?:type\s+|\.{3})/u, ''))?.[0]
    })
    .filter((name) => name !== undefined)

const declaredOrGenericNames = (source) => {
  const code = source.replaceAll(NOT_CODE, ' ')
  return new Set([
    ...[...code.matchAll(DECLARED)].map((match) => match[1]),
    ...[...code.matchAll(DESTRUCTURED)].flatMap((match) => localNames(match[1])),
    ...[...code.matchAll(IMPORTED)].flatMap((match) =>
      localNames(match[1].replaceAll(/[{}]/gu, ',').replace(/\*\s+as\s+/u, '')),
    ),
    ...[...code.matchAll(GENERIC_TYPE)].map((match) => match[1]),
  ])
}

const standsAlone = (source, placeholder) =>
  new RegExp(String.raw`(?<![\w$])__${placeholder}__(?![\w$])`, 'u').test(source)

export const namesTakenByTemplates = (files, nameByPlaceholder) =>
  files
    .filter((file) => TYPESCRIPT_FILE.test(file))
    .flatMap((file) => {
      const source = readFileSync(file, 'utf8')
      const taken = declaredOrGenericNames(source)
      return Object.entries(nameByPlaceholder)
        .filter(([placeholder, name]) => standsAlone(source, placeholder) && taken.has(name))
        .map(([, name]) => ({ name, file }))
    })
