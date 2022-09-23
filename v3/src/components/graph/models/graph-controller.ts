import React from "react"
import {scaleBand, scaleLinear, scaleOrdinal} from "d3"
import {IGraphModel} from "./graph-model"
import {GraphLayout} from "./graph-layout"
import {IDataSet} from "../../../data-model/data-set"
import {
  AxisPlace,
  EmptyAxisModel,
  CategoricalAxisModel,
  ICategoricalAxisModel,
  INumericAxisModel,
  NumericAxisModel
} from "./axis-model"
import {PlotType} from "../graphing-types"
import {filterCases, matchCirclesToData, setNiceDomain} from "../utilities/graph_utils"

export interface IGraphControllerProps {
  graphModel: IGraphModel
  layout: GraphLayout
  dataset: IDataSet | undefined
  casesRef: React.MutableRefObject<string[]>
  enableAnimation:  React.MutableRefObject<boolean>
  instanceId:string
  dotsRef:React.RefObject<SVGSVGElement>
}

export class GraphController {
  graphModel: IGraphModel
  layout: GraphLayout
  dataset: IDataSet | undefined
  casesRef: React.MutableRefObject<string[]>
  enableAnimation:  React.MutableRefObject<boolean>
  instanceId:string
  dotsRef:React.RefObject<SVGSVGElement>


  constructor(props: IGraphControllerProps) {
    this.graphModel = props.graphModel
    this.layout = props.layout
    this.dataset = props.dataset
    this.casesRef = props.casesRef
    this.instanceId = props.instanceId
    this.enableAnimation = props.enableAnimation
    this.dotsRef = props.dotsRef
    // Presumably a new dataset is now being used. So we have to set things up for an empty graph
    this.initializeGraph()
  }

  initializeGraph() {
    const {graphModel, dataset, layout, casesRef, dotsRef, enableAnimation, instanceId} = this
    casesRef.current = filterCases(dataset, [])
    if( dotsRef) {
      matchCirclesToData({caseIDs: casesRef.current, dataset, dotsElement: dotsRef.current,
       enableAnimation, instanceId, xAttrID: '', yAttrID: ''})
    }
    layout.setAxisScale('bottom', scaleOrdinal())
    layout.setAxisScale('left', scaleOrdinal())
    graphModel.setGraphProperties({
      axes: {bottom: EmptyAxisModel.create({place: 'bottom'}), left: EmptyAxisModel.create({place: 'left'})},
      plotType: 'casePlot', attributeIDs: { bottom: '', left: ''}, cases: casesRef.current
    })
  }

  handleAttributeAssignment(place: AxisPlace, attrID:string) {
    const {dataset, graphModel, layout } = this,
      attribute = dataset?.attrFromID(attrID),
      attributeType = attribute?.type ?? 'empty',
      otherPlace = place === 'bottom' ? 'left' : 'bottom',
      otherAttrID = graphModel.getAttributeID(otherPlace),
      otherAttribute = dataset?.attrFromID(otherAttrID),
      otherAttributeType = otherAttribute?.type ?? 'empty',
      axisModel = graphModel.getAxis(place),
      currentAxisType = axisModel?.type,
      plotChoices: { [index: string]: { [index: string]: PlotType } } = {
        empty: {empty: 'casePlot', numeric: 'dotPlot', categorical: 'dotChart'},
        numeric: {empty: 'dotPlot', numeric: 'scatterPlot', categorical: 'dotPlot'},
        categorical: {empty: 'dotChart', numeric: 'dotPlot', categorical: 'dotChart'}
      },
      attrIDs: string[] = []
    attributeType !== 'empty' && attrIDs.push(attrID)
    otherAttributeType !== 'empty' && attrIDs.push(otherAttrID)
    graphModel.setCases(filterCases(dataset, attrIDs))
    // todo: Kirk, better way to do this?
    graphModel.setPlotType(plotChoices[attributeType][otherAttributeType])
    if (attributeType === 'numeric') {
      if (currentAxisType !== attributeType) {
        const newAxisModel = NumericAxisModel.create({place, min: 0, max: 1})
        graphModel.setAxis(place, newAxisModel as INumericAxisModel)
        layout.setAxisScale(place, scaleLinear())
        setNiceDomain(attribute?.numValues || [], newAxisModel)
      } else {
        setNiceDomain(attribute?.numValues || [], axisModel as INumericAxisModel)
      }
    } else if (attributeType === 'categorical') {
      const categories = Array.from(new Set(attribute?.strValues))
      if (currentAxisType !== attributeType) {
        const newAxisModel = CategoricalAxisModel.create({place})
        graphModel.setAxis(place, newAxisModel as ICategoricalAxisModel)
        layout.setAxisScale(place, scaleBand())
      }
      layout.axisScale(place)?.domain(categories)
    }

  }

  setDotsRef(dotsRef:React.RefObject<SVGSVGElement>) {
    this.dotsRef = dotsRef
}

}
