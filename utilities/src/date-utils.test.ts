import { convertToDate, createDate } from "./date-utils"

describe('createDate', () => {
  it('returns current date if no arguments are provided', () => {
    const date = createDate()
    const now = new Date()
    expect(date).toBeInstanceOf(Date)
    expect(date?.getTime()).toBeCloseTo(now.getTime(), -3)
  })

  it('interprets [0, 50) as 20xx year', () => {
    expect(createDate(1)).toEqual(new Date(2001, 0, 1))
    expect(createDate(10)).toEqual(new Date(2010, 0, 1))
    expect(createDate(20)).toEqual(new Date(2020, 0, 1))
    expect(createDate(30)).toEqual(new Date(2030, 0, 1))
    expect(createDate(49)).toEqual(new Date(2049, 0, 1))
  })

  it('interprets [50, 99] as 19xx year', () => {
    expect(createDate(50)).toEqual(new Date(1950, 0, 1))
    expect(createDate(60)).toEqual(new Date(1960, 0, 1))
    expect(createDate(70)).toEqual(new Date(1970, 0, 1))
    expect(createDate(99)).toEqual(new Date(1999, 0, 1))
  })

  it('interprets number as year if it\'s bigger than 100 but smaller than 5000', () => {
    expect(createDate(100)).toEqual(new Date(100, 0, 1))
    expect(createDate(1000)).toEqual(new Date(1000, 0, 1))
    expect(createDate(2000)).toEqual(new Date(2000, 0, 1))
    expect(createDate(4999)).toEqual(new Date(4999, 0, 1))
  })

  it('interprets number as epoch seconds if it\'s bigger than 5000', () => {
    expect(createDate(5000)).toEqual(new Date(5000 * 1000))
    expect(createDate(10000)).toEqual(new Date(10000 * 1000))
    expect(createDate(12345)).toEqual(new Date(12345 * 1000))
  })

  it('supports month, day, hours, minutes, seconds, and milliseconds arguments', () => {
    expect(createDate(2020, 2, 3, 4, 5, 6, 7)).toEqual(new Date(2020, 1, 3, 4, 5, 6, 7))
    expect(createDate(2020, 2, 3)).toEqual(new Date(2020, 1, 3))
    expect(createDate(2020, 2)).toEqual(new Date(2020, 1, 1))
  })

  it('assumes month is in range 1-12, but 0 is interpreted as January', () => {
    expect(createDate(2020, 0, 1)).toEqual(new Date(2020, 0, 1))
    expect(createDate(2020, 5, 1)).toEqual(new Date(2020, 4, 1))
  })
})

describe('convertToDate', () => {
  it('returns the date if it\'s already a Date object', () => {
    const date = new Date()
    expect(convertToDate(date)).toBe(date)
  })

  it('parses the date string', () => {
    expect(convertToDate('2020-01-01')).toEqual(new Date(2020, 0, 1))
  })

  it('parses the number as year when number is smaller than 5000', () => {
    expect(convertToDate(2020)).toEqual(new Date(2020, 0, 1))
    expect(convertToDate(4999)).toEqual(new Date(4999, 0, 1))
  })

  it('parses the number as epoch seconds when number is greater than 5000', () => {
    expect(convertToDate(5000)).toEqual(new Date(5000 * 1000))
    expect(convertToDate(12345)).toEqual(new Date(12345 * 1000))
  })

  it('returns null if the date is invalid', () => {
    expect(convertToDate('invalid')).toBeNull()
    expect(convertToDate(Infinity)).toBeNull()
    expect(convertToDate(null)).toBeNull()
  })
})
