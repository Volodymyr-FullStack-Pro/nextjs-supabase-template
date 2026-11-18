const DOCUMENT_FOLDERS = ['docs/', '.claude/']
const DOCUMENT_FILES = new Set(['.github/pull_request_template.md', 'supabase/README.md'])

const isRootMarkdown = (path) => path.endsWith('.md') && !path.includes('/')

const isDocument = (path) =>
  DOCUMENT_FOLDERS.some((folder) => path.startsWith(folder)) ||
  DOCUMENT_FILES.has(path) ||
  isRootMarkdown(path)

export const isDocumentsOnly = (paths) => paths.length > 0 && paths.every(isDocument)
