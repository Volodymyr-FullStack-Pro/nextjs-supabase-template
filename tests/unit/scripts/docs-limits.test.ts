import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import {
  architectureReferenceProblems,
  countLines,
  countWords,
  decisionIds,
  decisionProblems,
  glossaryProblems,
  LIMITS,
  markedDecisionIds,
  ruleProblems,
  sizeProblem,
  tableCellProblems,
  tableRows,
} from '../../../scripts/docs-limits.mjs'

const journal = (...rows: string[]) =>
  [
    '# Журнал решений',
    '',
    '| № | Дата | Решение | Кто решил | Статус |',
    '|---|---|---|---|---|',
    ...rows,
    '',
  ].join('\n')

const words = (count: number) => Array.from({ length: count }, () => 'слово').join(' ')

describe('countWords', () => {
  it('counts words separated by any whitespace', () => {
    expect(countWords('один  два\nтри\tчетыре ')).toBe(4)
  })

  it('counts nothing in an empty text', () => {
    expect(countWords('')).toBe(0)
  })
})

describe('countLines', () => {
  it('does not count the trailing newline as a line, as wc -l does', () => {
    expect(countLines('a\nb\nc\n')).toBe(3)
  })

  it('counts the last line without a newline', () => {
    expect(countLines('a\nb')).toBe(2)
  })
})

describe('tableRows', () => {
  it('returns the cells of data rows, without the header and the separator', () => {
    expect(tableRows(journal('| D-001 | 2026-11-02 | Решение | Разработчик | принято |'))).toEqual([
      ['D-001', '2026-11-02', 'Решение', 'Разработчик', 'принято'],
    ])
  })

  it('keeps an escaped pipe inside its cell', () => {
    const table = '| a | b |\n|---|---|\n| x \\| y | z |\n'
    expect(tableRows(table)).toEqual([['x \\| y', 'z']])
  })

  it('reads every table of the document', () => {
    const two = '| a |\n|---|\n| 1 |\n\ntext\n\n| b |\n| --- |\n| 2 |\n'
    expect(tableRows(two)).toEqual([['1'], ['2']])
  })
})

describe('sizeProblem', () => {
  it('reports a size over the limit with both numbers', () => {
    expect(sizeProblem('CLAUDE.md', 1501, 1500, 'слов')).toBe('CLAUDE.md: 1501 слов, предел 1500')
  })

  it('accepts a size equal to the limit', () => {
    expect(sizeProblem('CLAUDE.md', 1500, 1500, 'слов')).toBeUndefined()
  })
})

describe('ruleProblems', () => {
  it('reports a rule file longer than the word limit by its path', () => {
    const rules = [
      { path: '.claude/rules/ui.md', text: words(LIMITS.ruleWords) },
      { path: '.claude/rules/db.md', text: words(LIMITS.ruleWords + 1) },
    ]
    expect(ruleProblems(rules)).toEqual(['.claude/rules/db.md: 1001 слов, предел 1000'])
  })

  it('does not limit the number of lines', () => {
    const text = Array.from({ length: LIMITS.ruleWords }, () => 'слово').join('\n')
    expect(ruleProblems([{ path: '.claude/rules/tests.md', text }])).toEqual([])
  })
})

describe('decisionIds', () => {
  it('takes the number from a plain or a linked first cell', () => {
    const text = journal(
      '| D-001 | 2026-11-02 | Решение | Разработчик | принято |',
      '| [D-020](decisions/D-020.md) | 2026-11-09 | Решение | Разработчик | принято |',
    )
    expect(decisionIds(text)).toEqual(['D-001', 'D-020'])
  })
})

describe('decisionProblems', () => {
  it('accepts a short row', () => {
    const text = journal(
      '| D-001 | 2026-11-02 | Вопрос о сроках не задаём | Разработчик | принято |',
    )
    expect(decisionProblems(text, '')).toEqual([])
  })

  it('reports a row longer than the limit by its number', () => {
    const text = journal(
      `| D-002 | 2026-11-02 | ${words(LIMITS.decisionRowWords)} | Разработчик | принято |`,
    )
    expect(decisionProblems(text, '')).toEqual(['decisions.md, D-002: 44 слов, предел 40'])
  })

  it('does not count the pipes between cells as words', () => {
    const text = journal(
      `| D-003 | 2026-11-02 | ${words(LIMITS.decisionRowWords - 4)} | Разработчик | принято |`,
    )
    expect(decisionProblems(text, '')).toEqual([])
  })

  it('reports a journal with more rows than the limit', () => {
    const rows = Array.from(
      { length: LIMITS.decisionRows + 1 },
      (_, index) =>
        `| D-${String(index + 1).padStart(3, '0')} | 2026-11-02 | Решение | Разработчик | принято |`,
    )
    expect(decisionProblems(journal(...rows), '')).toEqual([
      'decisions.md: 101 строк, предел 100 — заменённые и выполненные разовые решения перенести в decisions/archive-<год>-Q<N>.md',
    ])
  })

  it('reports a decision marked for the architecture document but missing there', () => {
    const text = journal(
      '| D-020 | 2026-11-09 | Суммы — numeric | Разработчик | принято → architecture.md |',
    )
    expect(decisionProblems(text, '# Архитектура\n\nНичего о деньгах.\n')).toEqual([
      'decisions.md, D-020: помечено «→ architecture.md», но в docs/architecture.md не упомянуто',
    ])
  })

  it('accepts a marked decision that the architecture document names', () => {
    const text = journal(
      '| D-020 | 2026-11-09 | Суммы — numeric | Разработчик | принято → architecture.md |',
    )
    expect(decisionProblems(text, '### Суммы (D-020)\n')).toEqual([])
  })

  it('does not take D-0200 for D-020', () => {
    const text = journal(
      '| D-020 | 2026-11-09 | Суммы — numeric | Разработчик | принято → architecture.md |',
    )
    expect(decisionProblems(text, 'D-0200\n')).toHaveLength(1)
  })
})

describe('markedDecisionIds', () => {
  it('returns only the decisions marked for the architecture document', () => {
    const text = journal(
      '| D-010 | 2026-11-07 | Константы | Разработчик | принято → architecture.md |',
      '| D-011 | 2026-11-07 | Смягчены правила | Разработчик | принято |',
    )
    expect(markedDecisionIds(text)).toEqual(['D-010'])
  })
})

describe('architectureReferenceProblems', () => {
  const marked = journal('| D-020 | 2026-11-09 | Суммы | Разработчик | принято → architecture.md |')

  it('reports a decision number the journal and its archive do not have', () => {
    expect(architectureReferenceProblems('Основание: D-020, D-999.', [marked])).toEqual([
      'docs/architecture.md: ссылка на D-999, которого нет в журнале и архиве решений',
    ])
  })

  it('reports each missing number once', () => {
    expect(architectureReferenceProblems('D-999 и снова D-999', [])).toHaveLength(1)
  })

  it('reports a cited decision whose journal row has no marker', () => {
    const unmarked = journal('| D-030 | 2026-11-12 | Генератор в CI | Разработчик | принято |')
    expect(architectureReferenceProblems('Основание: D-030.', [unmarked])).toEqual([
      'docs/architecture.md: ссылка на D-030, а в журнале у него нет пометки «→ architecture.md» — действующее решение пометить, заменённое убрать из документа',
    ])
  })

  it('accepts a cited decision marked in an archive file', () => {
    const archive = journal(
      '| D-004 | 2026-11-04 | Котировки | Заказчик | заменено → architecture.md |',
    )
    expect(architectureReferenceProblems('D-004', [journal(), archive])).toEqual([])
  })
})

describe('LIMITS', () => {
  const rules = readFileSync(new URL('../../../.claude/rules/docs.md', import.meta.url), 'utf8')
  const rows = z.array(z.array(z.string())).parse(tableRows(rules))
  const numbersInRow = (file: string) =>
    (rows.find((cells) => cells[0] === `\`${file}\``)?.at(-1) ?? '')
      .replaceAll(/(\d)\s(?=\d{3})/gu, '$1')
      .match(/\d+/gu)
      ?.map(Number) ?? []

  it.each([
    ['CLAUDE.md', [LIMITS.claudeWords]],
    ['.claude/rules/*.md', [LIMITS.ruleWords]],
    ['docs/architecture.md', [LIMITS.architectureLines]],
    ['docs/knowledge/decisions.md', [LIMITS.decisionRowWords, LIMITS.decisionRows]],
    ['docs/knowledge/requirements.md', [LIMITS.requirementCellWords]],
    ['docs/knowledge/open-questions.md', [LIMITS.openQuestionsLines]],
    ['docs/glossary.md', [LIMITS.glossaryEntryLines]],
    ['.claude/handoff.md', [LIMITS.handoffLines]],
  ])('match the table of .claude/rules/docs.md for %s', (file, limits) => {
    expect(numbersInRow(file)).toEqual(expect.arrayContaining(limits))
  })
})

describe('tableCellProblems', () => {
  it('reports a cell over the limit by the row number and column', () => {
    const table = `| № | Ответ |\n|---|---|\n| A1 | ${words(LIMITS.requirementCellWords + 1)} |\n`
    expect(tableCellProblems(table, 'requirements.md', LIMITS.requirementCellWords)).toEqual([
      'requirements.md, A1, столбец 2: 41 слов, предел 40',
    ])
  })

  it('accepts cells within the limit', () => {
    const table = `| № | Ответ |\n|---|---|\n| A1 | ${words(LIMITS.requirementCellWords)} |\n`
    expect(tableCellProblems(table, 'requirements.md', LIMITS.requirementCellWords)).toEqual([])
  })
})

describe('glossaryProblems', () => {
  it('reports an entry longer than the limit by its heading', () => {
    const glossary = `# Глоссарий\n\n## Реестр требований\n\n${'строка\n'.repeat(LIMITS.glossaryEntryLines + 1)}`
    expect(glossaryProblems(glossary)).toEqual([
      'glossary.md, «Реестр требований»: 5 строк, предел 4',
    ])
  })

  it('does not count blank lines and the introduction before the first entry', () => {
    const glossary = `# Глоссарий\n\n${'вступление\n'.repeat(10)}\n## Понятие\n\nЧто это.\n\nЗачем.\nУ нас.\n`
    expect(glossaryProblems(glossary)).toEqual([])
  })
})
