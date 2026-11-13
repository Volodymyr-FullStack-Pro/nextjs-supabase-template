import { describe, expect, it } from 'vitest'

import { cyrillicComments } from '../../../scripts/comment-language.mjs'

const lines = (...text: string[]) => text.join('\n')

describe('cyrillicComments in TypeScript and JavaScript', () => {
  it('finds a line comment after code', () => {
    expect(cyrillicComments('src/a.ts', 'const a = 1 // сумма')).toEqual([
      { line: 1, text: '// сумма' },
    ])
  })

  it('reports the line of a block comment that holds Cyrillic', () => {
    const text = lines('/**', ' * English', ' * Русский', ' */', 'export const a = 1')
    expect(cyrillicComments('scripts/a.mjs', text)).toEqual([{ line: 3, text: '* Русский' }])
  })

  it('finds a comment inside JSX', () => {
    const text = lines(
      'export const A = () => (',
      '  <div>',
      '    {/* подпись */}',
      '  </div>',
      ')',
    )
    expect(cyrillicComments('src/a.tsx', text)).toEqual([{ line: 3, text: '/* подпись */' }])
  })

  it('finds a comment at the end of the file', () => {
    expect(cyrillicComments('src/a.ts', lines('export const a = 1', '// конец'))).toEqual([
      { line: 2, text: '// конец' },
    ])
  })

  it('finds Ukrainian letters', () => {
    expect(cyrillicComments('src/a.mts', '// їжак і ґанок є')).toHaveLength(1)
  })

  it('ignores strings, JSX text, regular expressions and templates', () => {
    const text = lines(
      "const label = 'Выйти'",
      "const url = 'https://сайт.рф/путь'",
      'const pattern = /\\/\\/ ж/u',
      'const template = `${label} // ж`',
      'export const A = () => <p>Главная // не комментарий</p>',
      'export const B = () => (',
      '  <p>',
      '    // текст страницы',
      '  </p>',
      ')',
    )
    expect(cyrillicComments('src/a.tsx', text)).toEqual([])
  })

  it('ignores English comments', () => {
    expect(cyrillicComments('src/a.ts', '// D-041: tax is rounded once')).toEqual([])
  })
})

describe('cyrillicComments in SQL', () => {
  it('finds line and block comments', () => {
    const text = lines(
      'create table t (id int); -- таблица',
      '/* English',
      '   описание */',
      'select 1;',
    )
    expect(cyrillicComments('supabase/migrations/1_t.sql', text)).toEqual([
      { line: 1, text: '-- таблица' },
      { line: 3, text: 'описание */' },
    ])
  })

  it('finds comments inside a function body', () => {
    const text = lines('create function f() returns void as $$', 'begin', '  -- шаг', 'end $$;')
    expect(cyrillicComments('supabase/tests/1.sql', text)).toEqual([{ line: 3, text: '-- шаг' }])
  })

  it('ignores comment markers inside strings', () => {
    const text = lines(
      "select '-- не комментарий', 'it''s /* тоже */';",
      "raise exception 'Нельзя менять запись';",
      'select "колонка -- имя" from t;',
    )
    expect(cyrillicComments('supabase/migrations/1_t.sql', text)).toEqual([])
  })
})

describe('cyrillicComments in hash-commented files', () => {
  it.each([
    ['.github/workflows/ci.yml', 'on: push # запуск'],
    ['supabase/config.toml', 'port = 54321 # порт'],
    ['scripts/run.sh', 'echo ok # проверка'],
    ['.gitignore', '# сборка'],
    ['supabase/.gitignore', '# локальное'],
    ['.env.example', '# ключ'],
    ['.npmrc', '# закреплено'],
  ])('finds a comment in %s', (path, text) => {
    expect(cyrillicComments(path, text)).toHaveLength(1)
  })

  it('ignores a hash inside quotes or a word', () => {
    const text = lines(
      'tag: "#тег"',
      "title: 'а # б'",
      'url: https://пример.рф/#якорь',
      'run: echo "it\'s # не комментарий"',
    )
    expect(cyrillicComments('.github/workflows/ci.yml', text)).toEqual([])
  })
})

describe('cyrillicComments in CSS', () => {
  it('finds block comments and ignores strings', () => {
    const text = lines('.a { content: "/* нет */"; }', '/* тема */')
    expect(cyrillicComments('src/app/globals.css', text)).toEqual([{ line: 2, text: '/* тема */' }])
  })
})

describe('cyrillicComments in other files', () => {
  it.each(['package.json', 'docs/a.md', 'public/logo.svg', '.jscpd.json'])(
    'does not scan %s',
    (path) => {
      expect(cyrillicComments(path, '// русский # текст -- везде /* тут */')).toEqual([])
    },
  )

  it.each([
    'supabase/migrations/20251231000000_default_privileges.sql',
    'supabase/migrations/20261110102812_notes_currency_and_request_id.sql',
  ])('does not scan the merged migration %s', (path) => {
    expect(cyrillicComments(path, '-- русский')).toEqual([])
  })

  it('scans a migration newer than the merged ones', () => {
    expect(
      cyrillicComments('supabase/migrations/20261112212905_drop_notes_sample.sql', '-- русский'),
    ).toEqual([{ line: 1, text: '-- русский' }])
  })
})
