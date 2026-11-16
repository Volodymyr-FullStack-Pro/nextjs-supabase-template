import { describe, expect, it } from 'vitest'

import { LIMITS } from '../../../scripts/docs-limits.mjs'
import {
  brokenLinkProblems,
  knownPaths,
  linkTargets,
  orphanProblems,
  roadmapNowProblem,
  stalePlanProblems,
} from '../../../scripts/docs-structure.mjs'

const words = (count: number) => Array.from({ length: count }, () => 'слово').join(' ')
const roadmap = (now: string, later = '- [ ] B01') =>
  `# Дорожная карта\n\n## Сейчас\n\n${now}\n\n## Спринт 1\n\n${later}\n`

describe('roadmapNowProblem', () => {
  it('accepts the «Сейчас» section at the limit', () => {
    expect(roadmapNowProblem(roadmap(words(LIMITS.roadmapNowWords)))).toBeUndefined()
  })

  it('reports the «Сейчас» section over the limit', () => {
    expect(roadmapNowProblem(roadmap(words(LIMITS.roadmapNowWords + 1)))).toBe(
      `docs/roadmap.md, «Сейчас»: ${String(LIMITS.roadmapNowWords + 1)} words, limit ${String(LIMITS.roadmapNowWords)}`,
    )
  })

  it('does not count the sections after «Сейчас»', () => {
    expect(roadmapNowProblem(roadmap('B00', words(LIMITS.roadmapNowWords * 2)))).toBeUndefined()
  })

  it('finds the heading with a trailing space and Windows line endings', () => {
    const text = `## Сейчас \r\n\r\n${words(LIMITS.roadmapNowWords + 1)}\r\n\r\n## Спринт 1\r\n`
    expect(roadmapNowProblem(text)).toBe(
      `docs/roadmap.md, «Сейчас»: ${String(LIMITS.roadmapNowWords + 1)} words, limit ${String(LIMITS.roadmapNowWords)}`,
    )
  })

  it('reports a roadmap without the «Сейчас» section', () => {
    expect(roadmapNowProblem('# Дорожная карта\n\n## Сейчас (16.11)\n\nB00\n')).toBe(
      'docs/roadmap.md: section «Сейчас» is missing',
    )
  })
})

describe('stalePlanProblems', () => {
  const plan = 'docs/plans/docs-restructure.md'

  it('accepts a plan named in «Сейчас»', () => {
    expect(stalePlanProblems([plan], roadmap(`План — \`${plan}\`.`))).toEqual([])
  })

  it('accepts a plan named by a link relative to the roadmap', () => {
    expect(stalePlanProblems([plan], roadmap('[план](plans/docs-restructure.md)'))).toEqual([])
  })

  it('leaves a missing «Сейчас» section to roadmapNowProblem', () => {
    expect(stalePlanProblems([plan], '# Дорожная карта\n')).toEqual([])
  })

  it('reports a plan «Сейчас» does not name', () => {
    expect(stalePlanProblems([plan], roadmap('B00-T04'))).toEqual([
      `${plan}: «Сейчас» in docs/roadmap.md does not name it — delete the plan of a finished task`,
    ])
  })

  it('reports a plan named only outside «Сейчас»', () => {
    expect(stalePlanProblems([plan], roadmap('B00-T04', plan))).toHaveLength(1)
  })

  it('checks only plans of docs/plans, not block plans or other files', () => {
    const paths = ['docs/blocks/B00-setup/plans/B00-T08.md', 'docs/roadmap.md', 'docs/plans/a.txt']
    expect(stalePlanProblems(paths, roadmap('B00-T04'))).toEqual([])
  })
})

describe('linkTargets', () => {
  it('resolves a markdown link from the folder of the file and drops the anchor', () => {
    expect(
      linkTargets('docs/knowledge/open-questions.md', '[правила](../ops/db-rules.md#раздел-4)'),
    ).toEqual(['docs/ops/db-rules.md'])
  })

  it('reads repository paths written in the text', () => {
    expect(
      linkTargets('CLAUDE.md', 'Образцы — `docs/ops/github/`, план — docs/roadmap.md.'),
    ).toEqual(['docs/ops/github', 'docs/roadmap.md'])
  })

  it('skips web links, mail links and anchors of the same page', () => {
    const text = '[a](https://example.com/docs/x.md) [b](mailto:a@example.com) [c](#люди)'
    expect(linkTargets('docs/README.md', text)).toEqual([])
  })

  it('reads links with a title, in angle brackets and percent-encoded', () => {
    const text =
      '[a](roadmap.md "План") [b](<ops/my file.md>) [c](ops/my%20file.md) [d](<https://a.b>)'
    expect(linkTargets('docs/README.md', text)).toEqual(['docs/roadmap.md', 'docs/ops/my file.md'])
  })

  it('resolves a link that starts with a slash from the repository root', () => {
    expect(linkTargets('docs/knowledge/open-questions.md', '[план](/docs/roadmap.md)')).toEqual([
      'docs/roadmap.md',
    ])
  })

  it('drops the query string of a link', () => {
    expect(linkTargets('docs/README.md', '[a](roadmap.md?plain=1#L3)')).toEqual(['docs/roadmap.md'])
  })

  it('skips markdown links shown as code', () => {
    const text = 'Задача — `[название](url)`.\n\n```md\n[пример](missing.md)\n```\n'
    expect(linkTargets('.claude/rules/clickup.md', text)).toEqual([])
  })
})

describe('orphanProblems', () => {
  const orphan = (path: string) =>
    `${path}: no other file links to it or to its folder — link it from docs/README.md or delete it`

  it('accepts a file another file links to', () => {
    const sources = [{ path: 'CLAUDE.md', text: '[карта](docs/README.md)' }]
    expect(orphanProblems(['docs/README.md'], sources)).toEqual([])
  })

  it('accepts files whose folder is linked', () => {
    const sources = [{ path: 'docs/README.md', text: '[настройки](ops/github/)' }]
    expect(orphanProblems(['docs/ops/github/branch-protection.json'], sources)).toEqual([])
  })

  it('does not let a folder link cover the folders below it', () => {
    const sources = [{ path: 'docs/README.md', text: '[знания](knowledge/)' }]
    expect(orphanProblems(['docs/knowledge/archive/old.md'], sources)).toEqual([
      orphan('docs/knowledge/archive/old.md'),
    ])
  })

  it('does not count a link of the file to itself', () => {
    const sources = [{ path: 'docs/release.md', text: 'Этот файл — `docs/release.md`.' }]
    expect(orphanProblems(['docs/release.md'], sources)).toEqual([orphan('docs/release.md')])
  })

  it('does not count mentions in history: the journal, decision records, client documents, handoff', () => {
    const text = 'Файл — `docs/ops/old.md`.'
    const sources = [
      'docs/knowledge/decisions.md',
      'docs/knowledge/decisions/D-020.md',
      'docs/client/tz/archive/notes.md',
      '.claude/handoff.md',
    ].map((path) => ({ path, text }))
    expect(orphanProblems(['docs/ops/old.md'], sources)).toEqual([orphan('docs/ops/old.md')])
  })

  it('does not check client documents, decision records and files outside docs', () => {
    const files = [
      'docs/client/tz/archive/v2.0.pdf',
      'docs/knowledge/decisions/D-001.md',
      'src/a.ts',
    ]
    expect(orphanProblems(files, [])).toEqual([])
  })
})

describe('brokenLinkProblems', () => {
  const exists = (path: string) => ['docs/roadmap.md', 'docs/ops/github'].includes(path)

  it('accepts links to existing files and folders, with an anchor too', () => {
    const sources = [{ path: 'docs/README.md', text: '[a](roadmap.md#сейчас) [b](ops/github/)' }]
    expect(brokenLinkProblems(sources, exists)).toEqual([])
  })

  it('reports a link to a missing file, resolved from the folder of the file', () => {
    const sources = [{ path: 'docs/README.md', text: '[карта](../roadmap.md)' }]
    expect(brokenLinkProblems(sources, exists)).toEqual([
      'docs/README.md: broken link ../roadmap.md',
    ])
  })

  it('reports a link with a title to a missing file', () => {
    const sources = [{ path: 'docs/README.md', text: '[a](missing.md "Нет")' }]
    expect(brokenLinkProblems(sources, exists)).toEqual(['docs/README.md: broken link missing.md'])
  })

  it('does not check path mentions in the text, client documents and files that are not markdown', () => {
    const sources = [
      { path: 'docs/README.md', text: 'Было — `docs/tz/`.' },
      { path: 'docs/client/design-board/history/plan.md', text: '[a](missing.md)' },
      { path: 'scripts/docs-check.mjs', text: '// [a](missing.md)' },
    ]
    expect(brokenLinkProblems(sources, exists)).toEqual([])
  })
})

describe('knownPaths', () => {
  it('lists the files, every folder above them and the repository root', () => {
    expect([...knownPaths(['docs/ops/github/a.json', 'README.md'])].toSorted()).toEqual([
      '.',
      'README.md',
      'docs',
      'docs/ops',
      'docs/ops/github',
      'docs/ops/github/a.json',
    ])
  })
})
