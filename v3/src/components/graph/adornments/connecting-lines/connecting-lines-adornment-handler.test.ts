import { getAdornmentContentInfo } from "../adornment-content-info"
import { kConnectingLinesType } from "./connecting-lines-adornment-types"
import { connectingLinesAdornmentHandler } from "./connecting-lines-adornment-handler"
import "./connecting-lines-adornment-registration"

describe("ConnectingLinesRegistration", () => {
  it("registers content info", () => {
    const connectingLinesContentInfo = getAdornmentContentInfo(kConnectingLinesType)
    expect(connectingLinesContentInfo).toBeDefined()
    expect(connectingLinesContentInfo?.type).toBe(kConnectingLinesType)
    expect(connectingLinesContentInfo?.modelClass).toBeDefined()
    expect(connectingLinesContentInfo?.prefix).toBe("ADRN")
  })
})

describe("ConnectingLinesAdornmentHandler", () => {
  const handler = connectingLinesAdornmentHandler

  let mockGraphContent: any
  let mockAdornmentsStore: any

  beforeEach(() => {
    mockAdornmentsStore = {
      showConnectingLines: false,
      setShowConnectingLines: jest.fn()
    }
    mockGraphContent = {
      plotType: "scatterPlot",
      adornmentsStore: mockAdornmentsStore
    }
  })

  it("create enables connecting lines when isVisible is true", () => {
    const result = handler.create!({ 
      graphContent: mockGraphContent, 
      values: { type: kConnectingLinesType, isVisible: true } 
    })
    
    expect(result?.success).toBe(true)
    expect(mockAdornmentsStore.setShowConnectingLines).toHaveBeenCalledWith(true)
  })

  it("create disables connecting lines when isVisible is false", () => {
    const result = handler.create!({ 
      graphContent: mockGraphContent, 
      values: { type: kConnectingLinesType, isVisible: false } 
    })
    
    expect(result?.success).toBe(true)
    expect(mockAdornmentsStore.setShowConnectingLines).toHaveBeenCalledWith(false)
  })

  it("create defaults to true when isVisible is not provided", () => {
    const result = handler.create!({ 
      graphContent: mockGraphContent, 
      values: { type: kConnectingLinesType } 
    })
    
    expect(result?.success).toBe(true)
    expect(mockAdornmentsStore.setShowConnectingLines).toHaveBeenCalledWith(true)
  })

  it("get returns the current state of connecting lines", () => {
    mockAdornmentsStore.showConnectingLines = true
    
    const mockAdornment = { id: "connecting-lines", type: kConnectingLinesType, isVisible: true } as any
    const result = handler.get(mockAdornment, mockGraphContent)
    
    expect(result).toEqual({
      id: "connecting-lines",
      isVisible: true,
      type: kConnectingLinesType
    })
  })

  it("update enables connecting lines when isVisible is true", () => {
    const result = handler.update!({ 
      graphContent: mockGraphContent, 
      values: { type: kConnectingLinesType, isVisible: true } 
    })
    
    expect(result?.success).toBe(true)
    expect(mockAdornmentsStore.setShowConnectingLines).toHaveBeenCalledWith(true)
  })

  it("update disables connecting lines when isVisible is false", () => {
    const result = handler.update!({ 
      graphContent: mockGraphContent, 
      values: { type: kConnectingLinesType, isVisible: false } 
    })
    
    expect(result?.success).toBe(true)
    expect(mockAdornmentsStore.setShowConnectingLines).toHaveBeenCalledWith(false)
  })

  it("delete disables connecting lines", () => {
    const result = handler.delete!({ graphContent: mockGraphContent })
    
    expect(result?.success).toBe(true)
    expect(mockAdornmentsStore.setShowConnectingLines).toHaveBeenCalledWith(false)
  })

  it("create returns error for unsupported plot types", () => {
    mockGraphContent.plotType = "barChart"
    
    const result = handler.create!({ 
      graphContent: mockGraphContent, 
      values: { type: kConnectingLinesType, isVisible: true } 
    })
    
    expect(result?.success).toBe(false)
    expect(mockAdornmentsStore.setShowConnectingLines).not.toHaveBeenCalled()
  })
}) 