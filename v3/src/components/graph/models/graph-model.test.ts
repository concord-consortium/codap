import {GraphContentModel} from "./graph-content-model"
import { kGraphTileType } from '../graph-defs'
import { defaultBackgroundColor, defaultPointColor, defaultStrokeColor } from "../../../utilities/color-utils"
import { MovablePointAdornmentModel } from '../adornments/movable-point/movable-point-adornment-model'

describe('GraphContentModel', () => {
  it('should create an instance with defaults', () => {
    const graphModel = GraphContentModel.create()
    expect(graphModel.type).toBe(kGraphTileType)
    expect(graphModel.adornmentsStore.adornments.length).toBe(0)
    expect(graphModel.axes.size).toBe(0)
    expect(graphModel.plotType).toBe('casePlot')
    expect(graphModel.dataConfiguration).toBeTruthy()
    expect(graphModel.pointDescription._itemColors).toStrictEqual([defaultPointColor])
    expect(graphModel.pointDescription._itemStrokeColor).toBe(defaultStrokeColor)
    expect(graphModel.pointDescription.pointStrokeSameAsFill).toBe(false)
    expect(graphModel.plotBackgroundColor).toBe(defaultBackgroundColor)
    expect(graphModel.pointDescription.pointSizeMultiplier).toBe(1)
    expect(graphModel.isTransparent).toBe(false)
    expect(graphModel.plotBackgroundImageID).toBe('')
    expect(graphModel.plotBackgroundLockInfo).toBe(undefined)
    expect(graphModel.showParentToggles).toBe(false)
    expect(graphModel.showMeasuresForSelection).toBe(false)
  })
  it('should show and hide adornments', () => {
    const graphModel = GraphContentModel.create()
    expect(graphModel.adornmentsStore.adornments.length).toBe(0)
    const testAdornment = MovablePointAdornmentModel.create({id: 'test', type: 'Movable Point', isVisible: true})
    graphModel.adornmentsStore.showAdornment(testAdornment, 'Movable Point')
    expect(graphModel.adornmentsStore.adornments.length).toBe(1)
    expect(graphModel.adornmentsStore.adornments[0]).toBe(testAdornment)
    graphModel.adornmentsStore.hideAdornment('Movable Point')
    expect(graphModel.adornmentsStore.adornments[0].isVisible).toBe(false)
    graphModel.adornmentsStore.showAdornment(testAdornment, 'Movable Point')
    expect(graphModel.adornmentsStore.adornments[0].isVisible).toBe(true)
  })
})
