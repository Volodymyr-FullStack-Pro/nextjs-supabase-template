const SEVERITIES = new Set(['info', 'low', 'moderate', 'high', 'critical'])
const BLOCKING_SEVERITIES = new Set(['high', 'critical'])
const EXCEPTIONS_FILE = 'scripts/audit-exceptions.mjs'
const ADVISORY_ID = /^GHSA(?:-[\da-z]{4}){3}$/u
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/u
const MS_PER_DAY = 86_400_000
const UNKNOWN_ADVISORY = 'unknown-advisory'

export const MAX_EXCEPTION_DAYS = 31

const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value)

const isIsoDate = (value) =>
  typeof value === 'string' && ISO_DATE.test(value) && !Number.isNaN(Date.parse(value))

const daysBetween = (from, to) => (Date.parse(to) - Date.parse(from)) / MS_PER_DAY

function advisoryId({ url }) {
  if (typeof url !== 'string') return UNKNOWN_ADVISORY
  return url.slice(url.lastIndexOf('/') + 1) || UNKNOWN_ADVISORY
}

function advisoriesOf(report) {
  const advisories = new Map()
  for (const { via } of Object.values(report.vulnerabilities)) {
    for (const entry of Array.isArray(via) ? via : []) {
      if (typeof entry === 'string') continue
      const advisory = { ...entry, id: advisoryId(entry) }
      advisories.set(`${advisory.id} ${String(advisory.name)}`, advisory)
    }
  }
  return [...advisories.values()]
}

function exceptionFault({ id, reason, reviewBy, packages }, today) {
  if (typeof id !== 'string' || !ADVISORY_ID.test(id)) return 'needs an id like GHSA-xxxx-xxxx-xxxx'
  if (typeof reason !== 'string' || reason.trim() === '') return 'needs a reason'
  if (!Array.isArray(packages) || packages.length === 0) return 'needs the packages it covers'
  if (!isIsoDate(reviewBy)) return 'needs a review date like 2026-12-01'
  if (daysBetween(today, reviewBy) > MAX_EXCEPTION_DAYS) {
    return `is reviewed more than ${String(MAX_EXCEPTION_DAYS)} days from now`
  }
  return null
}

function exceptionProblem(exception, blocking, today) {
  const fault = exceptionFault(exception, today)
  if (fault !== null) return `exception ${String(exception.id)} ${fault}: fix ${EXCEPTIONS_FILE}`
  const { id, reviewBy } = exception
  if (!blocking.some((advisory) => advisory.id === id)) {
    return `exception ${id} is no longer reported: remove it from ${EXCEPTIONS_FILE}`
  }
  if (today > reviewBy) {
    return `exception ${id} expired on ${reviewBy}: update the package or review the exception`
  }
  return null
}

function countedButNotListed(report, blocking) {
  const counts = isRecord(report.metadata) ? report.metadata.vulnerabilities : undefined
  if (!isRecord(counts) || blocking.length > 0) return false
  return [counts.high, counts.critical].some((count) => count !== undefined && count !== 0)
}

export function auditProblems(report, exceptions, today) {
  if (!isRecord(report) || !isRecord(report.vulnerabilities)) {
    return ['npm audit returned no report']
  }
  const advisories = advisoriesOf(report)
  const blocking = advisories.filter(({ severity }) => BLOCKING_SEVERITIES.has(severity))
  const problems = advisories
    .filter(({ severity }) => !SEVERITIES.has(severity))
    .map(
      ({ id, name, severity }) =>
        `${id} in ${String(name)} has an unknown severity: ${String(severity)}`,
    )
  const inForce = []
  for (const exception of exceptions) {
    const problem = exceptionProblem(exception, blocking, today)
    if (problem === null) inForce.push(exception)
    else problems.push(problem)
  }
  const isExcused = ({ id, name }) =>
    inForce.some((exception) => exception.id === id && exception.packages.includes(name))
  for (const advisory of blocking) {
    if (isExcused(advisory)) continue
    const { severity, id, name, title } = advisory
    problems.push(`${severity} ${id} in ${String(name)}: ${String(title)}`)
  }
  if (countedButNotListed(report, blocking)) {
    problems.push('npm audit counts high or critical advisories but lists none')
  }
  return problems
}
