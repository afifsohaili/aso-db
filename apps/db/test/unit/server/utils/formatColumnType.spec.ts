import { describe, expect, it } from 'vitest'
import { formatColumnType } from '../../../../server/utils/db'

describe('formatColumnType', () => {
  it('maps character varying to varchar', () => {
    expect(formatColumnType('varchar', 'character varying', null, null, null)).toBe('varchar')
  })

  it('maps character varying with length to varchar(n)', () => {
    expect(formatColumnType('varchar', 'character varying', 255, null, null)).toBe('varchar(255)')
    expect(formatColumnType('varchar', 'character varying', 50, null, null)).toBe('varchar(50)')
  })

  it('maps bpchar to char', () => {
    expect(formatColumnType('bpchar', 'character', null, null, null)).toBe('char')
  })

  it('maps bpchar with length to char(n)', () => {
    expect(formatColumnType('bpchar', 'character', 10, null, null)).toBe('char(10)')
  })

  it('maps timestamp without time zone to timestamp', () => {
    expect(formatColumnType('timestamp', 'timestamp without time zone', null, null, null)).toBe('timestamp')
  })

  it('maps timestamp with time zone to timestamptz', () => {
    expect(formatColumnType('timestamptz', 'timestamp with time zone', null, null, null)).toBe('timestamptz')
  })

  it('maps double precision to float8', () => {
    expect(formatColumnType('float8', 'double precision', null, null, null)).toBe('float8')
  })

  it('maps integer to int4', () => {
    expect(formatColumnType('int4', 'integer', null, null, null)).toBe('int4')
  })

  it('maps bigint to int8', () => {
    expect(formatColumnType('int8', 'bigint', null, null, null)).toBe('int8')
  })

  it('maps smallint to int2', () => {
    expect(formatColumnType('int2', 'smallint', null, null, null)).toBe('int2')
  })

  it('formats numeric with precision and scale', () => {
    expect(formatColumnType('numeric', 'numeric', null, 10, 2)).toBe('numeric(10,2)')
  })

  it('formats numeric with precision only', () => {
    expect(formatColumnType('numeric', 'numeric', null, 10, 0)).toBe('numeric(10)')
    expect(formatColumnType('numeric', 'numeric', null, 10, null)).toBe('numeric(10)')
  })

  it('leaves numeric without precision unchanged', () => {
    expect(formatColumnType('numeric', 'numeric', null, null, null)).toBe('numeric')
  })

  it('formats array types', () => {
    expect(formatColumnType('_varchar', 'ARRAY', null, null, null)).toBe('varchar[]')
    expect(formatColumnType('_int4', 'ARRAY', null, null, null)).toBe('int4[]')
  })

  it('preserves user-defined types', () => {
    expect(formatColumnType('mood', 'USER-DEFINED', null, null, null)).toBe('mood')
  })

  it('preserves text type', () => {
    expect(formatColumnType('text', 'text', null, null, null)).toBe('text')
  })

  it('preserves boolean type', () => {
    expect(formatColumnType('bool', 'boolean', null, null, null)).toBe('bool')
  })

  it('preserves jsonb type', () => {
    expect(formatColumnType('jsonb', 'jsonb', null, null, null)).toBe('jsonb')
  })

  it('preserves uuid type', () => {
    expect(formatColumnType('uuid', 'uuid', null, null, null)).toBe('uuid')
  })

  it('preserves date type', () => {
    expect(formatColumnType('date', 'date', null, null, null)).toBe('date')
  })

  it('preserves bytea type', () => {
    expect(formatColumnType('bytea', 'bytea', null, null, null)).toBe('bytea')
  })

  it('preserves time without time zone as time', () => {
    expect(formatColumnType('time', 'time without time zone', null, null, null)).toBe('time')
  })

  it('preserves time with time zone as timetz', () => {
    expect(formatColumnType('timetz', 'time with time zone', null, null, null)).toBe('timetz')
  })
})
