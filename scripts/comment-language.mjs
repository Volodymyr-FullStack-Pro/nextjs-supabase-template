import { extname } from 'node:path'

import ts from 'typescript'

const CYRILLIC = /\p{Script=Cyrillic}/u
const WORD_CHARACTER = /[\p{L}\p{N}_]/u
const WHITESPACE = /\s/u
const HASH_COMMENTED = /(?:\.ya?ml|\.toml|\.sh|(?:^|\/)\.[\w-]+(?:\.example)?)$/u
const QUOTES = new Set(["'", '"'])
const BLOCK_START = '/*'
const BLOCK_END = '*/'
const LAST_MERGED_MIGRATION = '20261110102812'
const MIGRATION_VERSION = /^supabase\/migrations\/(\d{14})_/u

const SCRIPT_KINDS = new Map([
  ['.ts', ts.ScriptKind.TS],
  ['.mts', ts.ScriptKind.TS],
  ['.cts', ts.ScriptKind.TS],
  ['.tsx', ts.ScriptKind.TSX],
  ['.js', ts.ScriptKind.JS],
  ['.mjs', ts.ScriptKind.JS],
  ['.cjs', ts.ScriptKind.JS],
  ['.jsx', ts.ScriptKind.JSX],
])

function typescriptComments(path, text, kind) {
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, kind)
  const ranges = new Map()
  const collect = (position) => {
    const leading = ts.getLeadingCommentRanges(text, position) ?? []
    const trailing = ts.getTrailingCommentRanges(text, position) ?? []
    for (const range of [...leading, ...trailing]) ranges.set(range.pos, range)
  }
  const visit = (node) => {
    if (ts.isJSDoc(node) || node.kind === ts.SyntaxKind.JsxText) return
    const children = node.getChildren(source)
    if (children.length === 0) collect(node.pos)
    for (const child of children) visit(child)
  }
  visit(source)
  return [...ranges.values()]
}

function closingQuoteEnd(text, start) {
  const end = text.indexOf(text[start], start + 1)
  return end === -1 ? text.length : end + 1
}

function commentEnd(text, start, marker) {
  const end = text.indexOf(marker, start)
  if (end === -1) return text.length
  return marker === BLOCK_END ? end + marker.length : end
}

function delimitedComments(text, lineMarker) {
  const ranges = []
  let index = 0
  while (index < text.length) {
    if (QUOTES.has(text[index])) {
      index = closingQuoteEnd(text, index)
    } else if (text.startsWith(BLOCK_START, index)) {
      const end = commentEnd(text, index + BLOCK_START.length, BLOCK_END)
      ranges.push({ pos: index, end })
      index = end
    } else if (lineMarker !== undefined && text.startsWith(lineMarker, index)) {
      const end = commentEnd(text, index, '\n')
      ranges.push({ pos: index, end })
      index = end
    } else {
      index += 1
    }
  }
  return ranges
}

function opensQuote(line, index) {
  return QUOTES.has(line[index]) && (index === 0 || !WORD_CHARACTER.test(line[index - 1]))
}

function startsHashComment(line, index) {
  return line[index] === '#' && (index === 0 || WHITESPACE.test(line[index - 1]))
}

function hashCommentStart(line) {
  let index = 0
  while (index < line.length) {
    if (opensQuote(line, index)) index = closingQuoteEnd(line, index)
    else if (startsHashComment(line, index)) return index
    else index += 1
  }
  return -1
}

function hashComments(text) {
  const ranges = []
  let offset = 0
  for (const line of text.split('\n')) {
    const start = hashCommentStart(line)
    if (start !== -1) ranges.push({ pos: offset + start, end: offset + line.length })
    offset += line.length + 1
  }
  return ranges
}

function isMergedMigration(path) {
  const version = MIGRATION_VERSION.exec(path)?.[1]
  return version !== undefined && version <= LAST_MERGED_MIGRATION
}

function commentRanges(path, text) {
  if (isMergedMigration(path)) return []
  const extension = extname(path)
  const kind = SCRIPT_KINDS.get(extension)
  if (kind !== undefined) return typescriptComments(path, text, kind)
  if (extension === '.sql') return delimitedComments(text, '--')
  if (extension === '.css') return delimitedComments(text)
  if (HASH_COMMENTED.test(path)) return hashComments(text)
  return []
}

function lineOf(text, position) {
  return text.slice(0, position).split('\n').length
}

export function cyrillicComments(path, text) {
  return commentRanges(path, text)
    .toSorted((first, second) => first.pos - second.pos)
    .flatMap(({ pos, end }) => {
      const firstLine = lineOf(text, pos)
      return text
        .slice(pos, end)
        .split('\n')
        .map((part, offset) => ({ line: firstLine + offset, text: part.trim() }))
    })
    .filter((comment) => CYRILLIC.test(comment.text))
}
