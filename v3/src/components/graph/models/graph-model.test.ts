import { GraphModel } from './graph-model'
import { kGraphTileType } from '../graph-defs'
import { defaultBackgroundColor, defaultPointColor, defaultStrokeColor } from "../../../utilities/color-utils"
import { MovablePointModel } from '../adornments/movable-point/movable-point-model'

describe('GraphModel', () => {
  it('should create an instance with defaults', () => {
    const graphModel = GraphModel.create()
    expect(graphModel.type).toBe(kGraphTileType)
    expect(graphModel.adornments.length).toBe(0)
    expect(graphModel.axes.size).toBe(0)
    expect(graphModel.plotType).toBe('casePlot')
    expect(graphModel.config).toBeTruthy()
    expect(graphModel._pointColors).toStrictEqual([defaultPointColor])
    expect(graphModel._pointStrokeColor).toBe(defaultStrokeColor)
    expect(graphModel.pointStrokeSameAsFill).toBe(false)
    expect(graphModel.plotBackgroundColor).toBe(defaultBackgroundColor)
    expect(graphModel.pointSizeMultiplier).toBe(1)
    expect(graphModel.isTransparent).toBe(false)
    expect(graphModel.plotBackgroundImageID).toBe('')
    expect(graphModel.plotBackgroundLockInfo).toBe(undefined)
    expect(graphModel.showParentToggles).toBe(false)
    expect(graphModel.showMeasuresForSelection).toBe(false)
  })
  it('should show and hide adornments', () => {
    const graphModel = GraphModel.create()
    expect(graphModel.adornments.length).toBe(0)
    const testAdornment = MovablePointModel.create({id: 'test', type: 'Movable Point', isVisible: true})
    graphModel.showAdornment(testAdornment, 'Movable Point')
    expect(graphModel.adornments.length).toBe(1)
    expect(graphModel.adornments[0]).toBe(testAdornment)
    graphModel.hideAdornment('Movable Point')
    expect(graphModel.adornments[0].isVisible).toBe(false)
    graphModel.showAdornment(testAdornment, 'Movable Point')
    expect(graphModel.adornments[0].isVisible).toBe(true)
  })
})
