import { DIRequest, DIValues } from "./data-interactive-types"
import { RequestWorkUnit, takeNextWorkUnit, workUnitSize } from "./request-coalescer"

// minimal stand-in for the request queue's RequestPair
interface ITestPair {
  request: DIRequest
  callback: () => void
}

function createItemRequest(values: unknown, resource = "dataContext[data].item"): ITestPair {
  return { request: { action: "create", resource, values: values as DIValues }, callback: () => {} }
}

function getRequest(resource = "dataContext[data]"): ITestPair {
  return { request: { action: "get", resource }, callback: () => {} }
}

// narrow a work unit to the coalesced variant, failing the test if it isn't one
function expectCoalesced(unit?: RequestWorkUnit<ITestPair>) {
  if (unit?.type !== "coalesced") throw new Error(`expected a coalesced unit, got ${JSON.stringify(unit)}`)
  return unit
}

// consume all of the pairs, returning the resulting sequence of work units
function takeAllWorkUnits(pairs: ITestPair[], maxRunLength?: number) {
  const units: Array<RequestWorkUnit<ITestPair>> = []
  let i = 0
  while (i < pairs.length) {
    const unit = takeNextWorkUnit(pairs.slice(i), maxRunLength)!
    units.push(unit)
    i += workUnitSize(unit)
  }
  return units
}

describe("takeNextWorkUnit", () => {
  it("returns undefined when there are no requests", () => {
    expect(takeNextWorkUnit([])).toBeUndefined()
  })

  it("coalesces consecutive single-item creates for the same item resource", () => {
    const pairs = [
      createItemRequest({ a: 1 }),
      createItemRequest({ a: 2 }),
      createItemRequest({ a: 3 })
    ]
    const unit = expectCoalesced(takeNextWorkUnit(pairs))
    expect(unit.resource).toBe("dataContext[data].item")
    expect(unit.members).toEqual(pairs)
    expect(unit.segments).toEqual([[{ a: 1 }], [{ a: 2 }], [{ a: 3 }]])
    expect(workUnitSize(unit)).toBe(3)
  })

  it("limits a coalesced run to maxRunLength requests", () => {
    const pairs = Array.from({ length: 25 }, (_, i) => createItemRequest({ a: i }))
    const units = takeAllWorkUnits(pairs, 10)
    expect(units.length).toBe(3)
    expect(expectCoalesced(units[0]).members.length).toBe(10)
    expect(expectCoalesced(units[1]).members.length).toBe(10)
    expect(expectCoalesced(units[2]).members.length).toBe(5)
  })

  it("treats a lone create as a single unit", () => {
    const pair = createItemRequest({ a: 1 })
    const unit = takeNextWorkUnit([pair])
    expect(unit).toEqual({ type: "single", item: pair })
    expect(workUnitSize(unit!)).toBe(1)
  })

  it("does not coalesce across an intervening non-create request", () => {
    const pairs = [
      createItemRequest({ a: 1 }),
      createItemRequest({ a: 2 }),
      getRequest(),
      createItemRequest({ a: 3 }),
      createItemRequest({ a: 4 })
    ]
    const units = takeAllWorkUnits(pairs)
    expect(units.length).toBe(3)
    expect(expectCoalesced(units[0]).members).toEqual([pairs[0], pairs[1]])
    expect(units[1]).toEqual({ type: "single", item: pairs[2] })
    expect(expectCoalesced(units[2]).members).toEqual([pairs[3], pairs[4]])
  })

  it("does not coalesce creates targeting different resources", () => {
    const pairs = [
      createItemRequest({ a: 1 }, "dataContext[data1].item"),
      createItemRequest({ a: 2 }, "dataContext[data2].item")
    ]
    expect(takeAllWorkUnits(pairs)).toEqual([
      { type: "single", item: pairs[0] },
      { type: "single", item: pairs[1] }
    ])
  })

  it("does not coalesce array (multi-action) requests", () => {
    const arrayPair: ITestPair = {
      request: [
        { action: "create", resource: "dataContext[data].item", values: { a: 1 } },
        { action: "create", resource: "dataContext[data].item", values: { a: 2 } }
      ],
      callback: () => {}
    }
    const units = takeAllWorkUnits([arrayPair, createItemRequest({ a: 3 })])
    expect(units.length).toBe(2)
    expect(units[0]).toEqual({ type: "single", item: arrayPair })
    expect(units[1].type).toBe("single")
  })

  it("does not coalesce non-item resources", () => {
    const pairs = [
      createItemRequest({ a: 1 }, "dataContext[data].collection[cases].case"),
      createItemRequest({ a: 2 }, "dataContext[data].collection[cases].case")
    ]
    expect(takeAllWorkUnits(pairs)).toEqual([
      { type: "single", item: pairs[0] },
      { type: "single", item: pairs[1] }
    ])
  })

  it("does not coalesce creates without values", () => {
    const noValuesPair: ITestPair = {
      request: { action: "create", resource: "dataContext[data].item" },
      callback: () => {}
    }
    const units = takeAllWorkUnits([noValuesPair, createItemRequest({ a: 1 })])
    expect(units[0]).toEqual({ type: "single", item: noValuesPair })
    expect(units[1].type).toBe("single")
  })

  it("uses a member's values array as its whole segment", () => {
    const pairs = [
      createItemRequest([{ a: 1 }, { a: 2 }]),
      createItemRequest({ a: 3 })
    ]
    const unit = expectCoalesced(takeNextWorkUnit(pairs))
    expect(unit.segments).toEqual([[{ a: 1 }, { a: 2 }], [{ a: 3 }]])
  })
})
