import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { exceptedObjects } from '../../../scripts/convention-exceptions.mjs'

const ON_ONE_LINE = `
insert into convention_exceptions values ('zz_rate', 'rpc_numeric', 'D-999: курс возвращается числом');
`
const ON_SEPARATE_LINES = `
insert into convention_exceptions values
  ('currencies', 'audit', 'D-998: справочник'),
  ( 'zz_rate' ,  'rpc_numeric' , 'D-999: курс возвращается числом'), ('zz_fee', 'rpc_numeric', 'D-997: комиссия');
`
const COMMENTED_OUT = `
-- insert into convention_exceptions values
--   ('zz_rate', 'rpc_numeric', 'D-999: пример в комментарии');
  -- ('zz_fee', 'rpc_numeric', 'D-997: и с отступом');
`

describe('exceptedObjects', () => {
  it('reads an exception written on the line of the insert, as test 900 accepts it', () => {
    expect([...exceptedObjects(ON_ONE_LINE, 'rpc_numeric')]).toEqual(['zz_rate'])
  })

  it('reads exceptions written on their own lines, several to a line, with any spacing', () => {
    expect([...exceptedObjects(ON_SEPARATE_LINES, 'rpc_numeric')]).toEqual(['zz_rate', 'zz_fee'])
  })

  it('reads only the exceptions of the convention it is asked about', () => {
    expect([...exceptedObjects(ON_SEPARATE_LINES, 'audit')]).toEqual(['currencies'])
    expect([...exceptedObjects(ON_SEPARATE_LINES, 'rpc')]).toEqual([])
  })

  it('does not take a commented-out example for an exception', () => {
    expect([...exceptedObjects(COMMENTED_OUT, 'rpc_numeric')]).toEqual([])
  })

  it('finds no exceptions in the test as it ships: its only entries are commented examples', () => {
    const shipped = readFileSync('supabase/tests/900-table-conventions.sql', 'utf8')

    expect([...exceptedObjects(shipped, 'rpc_numeric')]).toEqual([])
    expect([...exceptedObjects(shipped, 'audit')]).toEqual([])
  })
})
