import { waitFor } from "@testing-library/react"
import { BoundaryManager, boundaryManager } from "./boundary-manager"

const kStateBoundaries = "US_state_boundaries"

describe("BoundaryManager", () => {
  it("works when initialized/empty", () => {
    expect(boundaryManager.boundaryKeys).toEqual([])
    expect(boundaryManager.isBoundarySet()).toBe(false)
    expect(boundaryManager.isBoundarySet("foo")).toBe(false)
    expect(boundaryManager.hasBoundaryData()).toBe(false)
    expect(boundaryManager.hasBoundaryData("foo")).toBe(false)
    expect(boundaryManager.isBoundaryDataPending()).toBe(false)
    expect(boundaryManager.isBoundaryDataPending("foo")).toBe(false)
    expect(boundaryManager.getBoundaryData("foo", "bar")).toBeUndefined()
  })

  it("fetches boundary data successfully", async () => {
    // mock the initial boundary specs request
    fetchMock.mockResponseOnce(JSON.stringify([
      {
        "name": kStateBoundaries,
        "format": "codap",
        "url": "US_State_Boundaries.codap"
      }
    ]), {
      headers: {
        "content-type": "application/json"
      }
    })

    const _boundaryManager = new BoundaryManager()
    // request has been submitted but response has not been received
    expect(_boundaryManager.boundaryKeys.length).toBe(0)
    await waitFor(() => {
      expect(_boundaryManager.boundaryKeys.length).toBe(1)
    })
    expect(_boundaryManager.isBoundarySet(kStateBoundaries)).toBe(true)

    // mock the boundary data request
    const kAlaskaBoundaryGuid = 1234
    const kAlaskaBoundaryData = { geometry: {}, coordinates: {}, features: {} }
    fetchMock.mockResponseOnce(JSON.stringify({
      contexts: [{
        collections: [
          // [0] boundary collection
          {
            cases: [{
              guid: kAlaskaBoundaryGuid,
              values: {
                boundary: kAlaskaBoundaryData
              }
            }]
          },
          // [1] key collection
          {
            cases: [{
              parent: kAlaskaBoundaryGuid,
              values: {
                key: "alaska"
              }
            }]
          }
        ]
      }]
    }))
    // request the boundary data
    _boundaryManager.getBoundaryData(kStateBoundaries, "Alaska")
    // boundary data is pending
    expect(_boundaryManager.hasBoundaryData(kStateBoundaries)).toBe(false)
    expect(_boundaryManager.isBoundaryDataPending(kStateBoundaries)).toBe(true)
    await waitFor(() => {
      expect(_boundaryManager.hasBoundaryData(kStateBoundaries)).toBe(true)
    })
    expect(_boundaryManager.isBoundaryDataPending(kStateBoundaries)).toBe(false)
    expect(_boundaryManager.getBoundaryData(kStateBoundaries, "Alaska")).toEqual(kAlaskaBoundaryData)
    expect(_boundaryManager.hasBoundaryDataError(kStateBoundaries)).toBe(false)
  })

  it("logs error when failing to fetch boundary specs", () => {
    fetchMock.mockRejectOnce(new Error("not found"))

    jestSpyConsole("error", async spy => {
      const _boundaryManager = new BoundaryManager()
      await waitFor(() => {
        expect(spy).toHaveBeenCalledTimes(1)
      })
      expect(_boundaryManager.boundaryKeys.length).toBe(0)
    })
  })

  it("logs error when failing to fetch boundary data", async () => {
    // mock the initial boundary specs request
    fetchMock.mockResponseOnce(JSON.stringify([
      {
        "name": kStateBoundaries,
        "format": "codap",
        "url": "US_State_Boundaries.codap"
      }
    ]), {
      headers: {
        "content-type": "application/json"
      }
    })

    const _boundaryManager = new BoundaryManager()
    await waitFor(() => {
      expect(_boundaryManager.boundaryKeys.length).toBe(1)
    })

    fetchMock.mockRejectOnce(new Error("not found"))

    jestSpyConsole("error", async spy => {
      const boundaryData = _boundaryManager.getBoundaryData(kStateBoundaries, "Alaska")
      expect(boundaryData).toBeUndefined()
      expect(_boundaryManager.isBoundaryDataPending(kStateBoundaries)).toBe(true)
      await waitFor(() => {
        expect(spy).toHaveBeenCalledTimes(1)
      })
      expect(_boundaryManager.isBoundaryDataPending(kStateBoundaries)).toBe(false)
      expect(_boundaryManager.hasBoundaryDataError(kStateBoundaries)).toBe(true)
    })
  })
})
