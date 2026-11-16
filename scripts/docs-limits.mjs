export const LIMITS = {
  claudeWords: 1500,
  ruleWords: 1000,
  architectureWords: 7000,
  decisionRowWords: 40,
  decisionRows: 200,
  requirementCellWords: 40,
  openQuestionsLines: 150,
  glossaryEntryLines: 4,
  handoffLines: 80,
  roadmapNowWords: 80,
}

const ARCHITECTURE_MARKER = '→ architecture.md'
const DECISION_ID = /D-\d{3}(?!\d)/gu
const SEPARATOR_ROW = /^\|[\s:|-]+\|$/u
const UNESCAPED_PIPE = /(?<!\\)\|/u
const ENTRY_HEADING = /^## (.+)$/u

export function countWords(text) {
  return text.split(/\s+/u).filter(Boolean).length
}

export function countLines(text) {
  const lines = text.split('\n')
  return lines.at(-1) === '' ? lines.length - 1 : lines.length
}

export function sizeProblem(label, actual, limit, unit) {
  return actual > limit ? `${label}: ${actual} ${unit}, limit ${limit}` : undefined
}

export function ruleProblems(rules) {
  return rules
    .map(({ path, text }) => sizeProblem(path, countWords(text), LIMITS.ruleWords, 'words'))
    .filter(Boolean)
}

function splitCells(line) {
  return line
    .trim()
    .replace(/^\|/u, '')
    .replace(/\|$/u, '')
    .split(UNESCAPED_PIPE)
    .map((cell) => cell.trim())
}

export function tableRows(markdown) {
  const rows = []
  let header = true
  for (const line of markdown.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('|')) {
      header = true
      continue
    }
    if (SEPARATOR_ROW.test(trimmed)) {
      header = false
      continue
    }
    if (!header) rows.push(splitCells(trimmed))
  }
  return rows
}

function idOf(cells) {
  return cells[0]?.match(DECISION_ID)?.[0] ?? cells[0] ?? ''
}

export function decisionIds(journal) {
  return tableRows(journal).map((cells) => idOf(cells))
}

const isMarked = (cells) => cells.some((cell) => cell.includes(ARCHITECTURE_MARKER))

function mentions(text, id) {
  return (text.match(DECISION_ID) ?? []).includes(id)
}

export function decisionProblems(journal, architecture) {
  const rows = tableRows(journal)
  const problems = []
  for (const cells of rows) {
    const id = idOf(cells)
    const tooLong = sizeProblem(
      `decisions.md, ${id}`,
      countWords(cells.join(' ')),
      LIMITS.decisionRowWords,
      'words',
    )
    if (tooLong) problems.push(tooLong)
    if (isMarked(cells) && !mentions(architecture, id)) {
      problems.push(
        `decisions.md, ${id}: marked «${ARCHITECTURE_MARKER}», but docs/architecture.md does not mention it`,
      )
    }
  }
  const tooMany = sizeProblem('decisions.md', rows.length, LIMITS.decisionRows, 'rows')
  if (tooMany) {
    problems.push(
      `${tooMany}: move replaced and completed one-off decisions to decisions/archive-<year>-Q<N>.md`,
    )
  }
  return problems
}

export function markedDecisionIds(journal) {
  return tableRows(journal)
    .filter((cells) => isMarked(cells))
    .map((cells) => idOf(cells))
}

export function architectureReferenceProblems(architecture, journals) {
  const known = new Set(journals.flatMap((journal) => decisionIds(journal)))
  const marked = new Set(journals.flatMap((journal) => markedDecisionIds(journal)))
  const cited = new Set(architecture.match(DECISION_ID) ?? [])
  const problems = []
  for (const id of cited) {
    if (!known.has(id)) {
      problems.push(
        `docs/architecture.md: links ${id}, which is in neither the decision log nor its archive`,
      )
    } else if (!marked.has(id)) {
      problems.push(
        `docs/architecture.md: links ${id}, which is not marked «${ARCHITECTURE_MARKER}» in the log; mark a current decision, remove a replaced one from the document`,
      )
    }
  }
  return problems
}

export function tableCellProblems(markdown, label, limit) {
  const problems = []
  for (const cells of tableRows(markdown)) {
    for (const [index, cell] of cells.entries()) {
      const problem = sizeProblem(
        `${label}, ${cells[0]}, column ${index + 1}`,
        countWords(cell),
        limit,
        'words',
      )
      if (problem) problems.push(problem)
    }
  }
  return problems
}

export function glossaryProblems(glossary) {
  const problems = []
  let entry
  let lines = 0
  const close = () => {
    if (entry === undefined) return
    const problem = sizeProblem(
      `glossary.md, «${entry}»`,
      lines,
      LIMITS.glossaryEntryLines,
      'lines',
    )
    if (problem) problems.push(problem)
  }
  for (const line of glossary.split('\n')) {
    const heading = ENTRY_HEADING.exec(line)
    if (heading) {
      close()
      entry = heading[1]
      lines = 0
    } else if (entry !== undefined && line.trim() !== '') {
      lines += 1
    }
  }
  close()
  return problems
}
