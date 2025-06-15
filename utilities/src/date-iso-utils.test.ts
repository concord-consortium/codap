import { formatStdISODateString, isStdISODateString, parseStdISODateString } from "./date-iso-utils"

describe('isStdISODateString', () => {
  test('returns true for strings that were produced by native Date.toISOString() method', () => {
    expect(isStdISODateString(new Date().toISOString())).toBe(true)
    expect(isStdISODateString(new Date(2023, 7, 17, 15, 30, 45, 123).toISOString())).toBe(true)
    expect(isStdISODateString(new Date(-2023, 7, 17, 15, 30, 45, 123).toISOString())).toBe(true)
    expect(isStdISODateString('2023-08-17T15:30:45.123Z')).toBe(true)
    expect(isStdISODateString('-002023-08-17T15:30:45.123Z')).toBe(true)
  })
  test('returns false for strings that were not produced by native Date.toISOString() method', () => {
    // Still valid ISO date strings, but not produced by native Date.toISOString() method
    expect(isStdISODateString('2023-08-17T15:30:45.123')).toBe(false)
    expect(isStdISODateString('2023-08-17T15:30:45.123Z+07:00')).toBe(false)
    expect(isStdISODateString('2023-08-17T15:30:45.123+07:00')).toBe(false)
    expect(isStdISODateString('2023-08-17T15:30:45.123-07:00')).toBe(false)
    expect(isStdISODateString('002023-08-17T15:30:45.123Z')).toBe(false)
  })
})

describe('formatStdISODateString', () => {
  test('works as expected', () => {
    expect(formatStdISODateString(new Date(2023, 7, 17, 15, 30, 45, 123))).toBe('2023-08-17T15:30:45.123Z')
  })
})

describe('formatStdISODateString & parseStdISODateString', () => {
  test('demonstrates round-trip fidelity', () => {
    const date1Str = formatStdISODateString(new Date())
    expect(formatStdISODateString(parseStdISODateString(date1Str))).toBe(date1Str)
    const date2Str = formatStdISODateString(new Date(2023, 7, 17, 15, 30, 45, 123))
    expect(formatStdISODateString(parseStdISODateString(date2Str))).toBe(date2Str)
    const date3Str = formatStdISODateString(new Date(-2023, 7, 17, 15, 30, 45, 123))
    expect(formatStdISODateString(parseStdISODateString(date3Str))).toBe(date3Str)
  })
})
