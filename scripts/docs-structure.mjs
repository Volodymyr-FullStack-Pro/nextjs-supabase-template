import { posix } from 'node:path'

import { countWords, LIMITS, sizeProblem } from './docs-limits.mjs'

const ROADMAP = 'docs/roadmap.md'
const NOW_HEADING = /^## Сейчас\s*$/u
const SECTION_HEADING = /^## /u
const LINE_BREAK = /\r?\n/u
const PLAN_FILE = /^docs\/plans\/[^/]+\.md$/u
const FENCED_CODE = /```[\s\S]*?```/gu
const INLINE_CODE = /`[^`\n]*`/gu
const MARKDOWN_LINK = /\]\(\s*(?:<([^>\n]+)>|([^)\s]+))(?:\s+(?:"[^"\n]*"|'[^'\n]*'))?\s*\)/gu
const EXTERNAL_LINK = /^(?:[a-z][a-z\d+.-]*:|#|\/\/)/iu
const LINK_SUFFIX = /[?#].*$/u
const DOCS_PATH = /(?<![\w./-])docs\/[\w./-]+/gu
const TRAILING_PUNCTUATION = /[./]+$/u
const TRAILING_SLASH = /\/$/u
const DOCS_ROOT = 'docs'
const REPOSITORY_ROOT = '.'
const UNCHECKED_FOLDERS = ['docs/client/', 'docs/knowledge/decisions/']
const HISTORY_FILES = new Set(['docs/knowledge/decisions.md', '.claude/handoff.md'])
const CLIENT_FOLDER = 'docs/client/'

function nowSection(roadmap) {
  const lines = roadmap.split(LINE_BREAK)
  const start = lines.findIndex((line) => NOW_HEADING.test(line))
  if (start === -1) return undefined
  const rest = lines.slice(start + 1)
  const end = rest.findIndex((line) => SECTION_HEADING.test(line))
  return (end === -1 ? rest : rest.slice(0, end)).join('\n')
}

export function roadmapNowProblem(roadmap) {
  const now = nowSection(roadmap)
  if (now === undefined) return `${ROADMAP}: section «Сейчас» is missing`
  return sizeProblem(`${ROADMAP}, «Сейчас»`, countWords(now), LIMITS.roadmapNowWords, 'words')
}

export function stalePlanProblems(paths, roadmap) {
  const now = nowSection(roadmap)
  if (now === undefined) return []
  const named = new Set(linkTargets(ROADMAP, now))
  return paths
    .filter((path) => PLAN_FILE.test(path) && !named.has(path))
    .map(
      (path) =>
        `${path}: «Сейчас» in ${ROADMAP} does not name it — delete the plan of a finished task`,
    )
}

function decoded(link) {
  try {
    return decodeURIComponent(link)
  } catch {
    return link
  }
}

function linkTarget(path, link) {
  const file = decoded(link.replace(LINK_SUFFIX, ''))
  const fromRoot = file.startsWith('/') ? file.slice(1) : posix.join(posix.dirname(path), file)
  return posix.normalize(fromRoot).replace(TRAILING_SLASH, '')
}

function markdownLinks(path, text) {
  const prose = text.replaceAll(FENCED_CODE, '').replaceAll(INLINE_CODE, '')
  return [...prose.matchAll(MARKDOWN_LINK)]
    .map(([, bracketed, plain]) => bracketed ?? plain)
    .filter((link) => !EXTERNAL_LINK.test(link))
    .map((link) => ({ link, target: linkTarget(path, link) }))
}

function pathMentions(text) {
  return [...text.matchAll(DOCS_PATH)]
    .map(([mention]) => mention.replace(TRAILING_PUNCTUATION, ''))
    .filter((mention) => mention !== DOCS_ROOT)
}

export function linkTargets(path, text) {
  const targets = [...markdownLinks(path, text).map(({ target }) => target), ...pathMentions(text)]
  return [...new Set(targets)]
}

const isHistory = (path) =>
  HISTORY_FILES.has(path) || UNCHECKED_FOLDERS.some((folder) => path.startsWith(folder))

function sourcesByTarget(sources) {
  const byTarget = new Map()
  for (const { path, text } of sources) {
    for (const target of linkTargets(path, text)) {
      const linking = byTarget.get(target)
      if (linking === undefined) byTarget.set(target, [path])
      else linking.push(path)
    }
  }
  return byTarget
}

export function orphanProblems(files, sources) {
  const byTarget = sourcesByTarget(sources.filter(({ path }) => !isHistory(path)))
  const isLinked = (file) =>
    [file, posix.dirname(file)].some((target) =>
      (byTarget.get(target) ?? []).some((source) => source !== file),
    )
  return files
    .filter((file) => file.startsWith(`${DOCS_ROOT}/`))
    .filter((file) => !UNCHECKED_FOLDERS.some((folder) => file.startsWith(folder)))
    .filter((file) => !isLinked(file))
    .map(
      (file) =>
        `${file}: no other file links to it or to its folder — link it from docs/README.md or delete it`,
    )
}

export function knownPaths(files) {
  const withFolders = files.flatMap((file) =>
    file.split('/').map((_part, index, parts) => parts.slice(0, index + 1).join('/')),
  )
  return new Set([REPOSITORY_ROOT, ...withFolders])
}

export function brokenLinkProblems(sources, exists) {
  return sources
    .filter(({ path }) => path.endsWith('.md') && !path.startsWith(CLIENT_FOLDER))
    .flatMap(({ path, text }) =>
      markdownLinks(path, text)
        .filter(({ target }) => !exists(target))
        .map(({ link }) => `${path}: broken link ${link}`),
    )
}
