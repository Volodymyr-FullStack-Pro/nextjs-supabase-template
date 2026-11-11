const COMMENT_LINE = /^\s*--/u

export function exceptedObjects(conventionsTest, convention) {
  const entry = new RegExp(
    String.raw`\(\s*'(?<name>[^']+)'\s*,\s*'${RegExp.escape(convention)}'\s*,`,
    'gu',
  )
  return new Set(
    conventionsTest
      .split('\n')
      .filter((line) => !COMMENT_LINE.test(line))
      .flatMap((line) => [...line.matchAll(entry)].map((match) => match.groups?.name ?? '')),
  )
}
