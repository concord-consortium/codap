import React from "react"
import {scaleBand, scaleLinear, scaleOrdinal} from "d3"
import {IGraphModel} from "./graph-model"
import {GraphLayout} from "./graph-layout"
import {GraphAttrRole, IAttributeDescriptionSnapshot}
  from "./data-configuration-model"
import {IDataSet} from "../../../models/data/data-set"
import {
  AxisPlace,
  EmptyAxisModel,
  CategoricalAxisModel,
  ICategoricalAxisModel,
  INumericAxisModel,
  NumericAxisModel, axisPlaceToAttrRole, attrRoleToAxisPlace, GraphPlace, IEmptyAxisModel, graphPlaceToAttrPlace
} from "./axis-model"
import {PlotType} from "../graphing-types"
import {matchCirclesToData, setNiceDomain} from "../utilities/graph-utils"
import {CodapV2Document} from "../../../v2/codap-v2-document"
import {ICodapV2GraphStorage, IGuidLink} from "../../../v2/codap-v2-types"

const plotChoices: Record<string, Record<string, PlotType>> = {
  empty: {empty: 'casePlot', numeric: 'dotPlot', categorical: 'dotChart'},
  numeric: {empty: 'dotPlot', numeric: 'scatterPlot', categorical: 'dotPlot'},
  categorical: {empty: 'dotChart', numeric: 'dotPlot', categorical: 'dotChart'}
}

export interface IGraphControllerProps {
  graphModel: IGraphModel
  layout: GraphLayout
  dataset: IDataSet | undefined
  enableAnimation: React.MutableRefObject<boolean>
  instanceId: string
  dotsRef: React.RefObject<SVGSVGElement>
  v2Document?: CodapV2Document
}

export class GraphController {
  graphModel: IGraphModel
  layout: GraphLayout
  dataset: IDataSet | undefined
  enableAnimation: React.MutableRefObject<boolean>
  instanceId: string
  dotsRef: React.RefObject<SVGSVGElement>
  v2Document?: CodapV2Document


  constructor(props: IGraphControllerProps) {
    this.graphModel = props.graphModel
    this.layout = props.layout
    this.dataset = props.dataset
    this.instanceId = props.instanceId
    this.enableAnimation = props.enableAnimation
    this.dotsRef = props.dotsRef
    this.v2Document = props.v2Document
    if (this.dataset) {
      this.graphModel.config.setDataset(this.dataset)
    }
    // Presumably a new dataset is now being used. So we have to set things up for an empty graph
    this.initializeGraph()
  }

  initializeGraph() {
    const {graphModel, layout, dotsRef, enableAnimation, instanceId, v2Document} = this,
      dataConfig = graphModel.config

    if (v2Document) {
      this.processV2Document()
    }
    else {
      // TODO, this may not be the reliable thing to test for AND/OR
      // we may need to be able to call setGraphProperties when axis' models are in place?
      if (!dotsRef.current){
        graphModel.setGraphProperties({
          axes: {bottom: EmptyAxisModel.create({place: 'bottom'}),
          left: EmptyAxisModel.create({place: 'left'})}, plotType: 'casePlot'
        })
      }
      else {
        matchCirclesToData({
          dataset: this.dataset,
          caseIDs: dataConfig.cases, dotsElement: dotsRef.current,
          pointRadius: graphModel.getPointRadius(), enableAnimation, instanceId
        })
      }
      layout.setAxisScale('bottom', scaleOrdinal())
      layout.setAxisScale('left', scaleOrdinal())
    }
  }

  processV2Document() {
    const {graphModel, layout, /*dotsRef, enableAnimation,*/ dataset, v2Document} = this,
      dataConfig = graphModel.config,
      firstV2GraphComponent = v2Document?.components.find(aComp => aComp.type === 'DG.GraphView'),
      storage = firstV2GraphComponent?.componentStorage as ICodapV2GraphStorage,
      links = storage?._links_ || {},
      attrTypes: Record<string, string> = {x: 'empty', y: 'empty', legend: 'empty'}
    Object.keys(links).forEach((aKey: keyof typeof links) => {
      if (['xAttr', 'yAttr', 'legendAttr'].includes(aKey)) {
        const match = aKey.match(/[a-z]+/),
          attrPlace = (match?.[0] ?? 'x') as GraphAttrRole,
          attrV2ID = (links[aKey] as IGuidLink<"DG.Attribute">).id,
          attrName = v2Document?.getAttribute(attrV2ID)?.object.name,
          attribute = dataset?.attrFromName(attrName),
          attrID = attribute?.id ?? '',
          attrSnapshot = {attributeID: attrID}
        dataConfig.setAttribute(attrPlace, attrSnapshot)
        graphModel.setAttributeID(attrPlace, attrID)
        if (['x', 'y'].includes(attrPlace)) {
          attrTypes[attrPlace] = attribute?.type ?? 'empty'
        }
      }
    })
    graphModel.setPlotType(plotChoices[attrTypes.x][attrTypes.y]);
    ['x', 'y'].forEach((attrPlace: GraphAttrRole) => {
      const axisPlace = attrRoleToAxisPlace[attrPlace],
        attrType = attrTypes[attrPlace]
      if(axisPlace) {
        let axisModel
        switch (attrType) {
          case 'numeric':
            axisModel = NumericAxisModel.create({place: axisPlace, min: 0, max: 1})
            graphModel.setAxis(axisPlace, axisModel)
            setNiceDomain(dataConfig.numericValuesForAttrRole(attrPlace), axisModel)
            layout.setAxisScale(axisPlace, scaleLinear().domain(axisModel.domain))
            break
          case 'categorical':
            axisModel = CategoricalAxisModel.create({place: axisPlace})
            graphModel.setAxis(axisPlace, axisModel)
            layout.setAxisScale(axisPlace,
              scaleBand().domain(dataConfig.categorySetForAttrRole(attrPlace)))
            break
          default:
            axisModel = EmptyAxisModel.create({place: axisPlace})
            graphModel.setAxis(axisPlace, axisModel)
            layout.setAxisScale(axisPlace, scaleOrdinal())
        }
      }
    })
  }

  handleAttributeAssignment(graphPlace: GraphPlace, attrID: string) {
    if(['plot', 'legend'].includes( graphPlace)) {
      this.layout.setLegendHeight(100) // todo: temporary!
      return  // Since there is no axis associated with the legend and the plotType will not change, we bail
    }
    const {dataset, graphModel, layout} = this,
      dataConfig = graphModel.config,
      axisPlace = graphPlace as AxisPlace,
      graphAttributeRole = axisPlaceToAttrRole[axisPlace],
      attribute = dataset?.attrFromID(attrID),
      attributeType = dataConfig.attributeType(graphPlaceToAttrPlace(graphPlace)) ?? 'empty',
      otherAxisPlace = axisPlace === 'bottom' ? 'left' : 'bottom',
      otherAttrRole = axisPlaceToAttrRole[otherAxisPlace],
      otherAttrID = graphModel.getAttributeID(axisPlaceToAttrRole[otherAxisPlace]),
      otherAttribute = dataset?.attrFromID(otherAttrID),
      otherAttributeType = otherAttribute?.type ?? 'empty',
      axisModel = graphModel.getAxis(axisPlace),
      currentAxisType = axisModel?.type,
      currentlyAssignedAttributeID = dataConfig.attributeID(graphAttributeRole),
      attrDescSnapshot: IAttributeDescriptionSnapshot = {attributeID: attrID},
      // Numeric attributes get priority for primaryRole when present. First one that is already present
      // and then the newly assigned one. If there is an already assigned categorical then its place is
      // the primaryRole, or, lastly, the newly assigned place
      primaryRole = otherAttributeType === 'numeric' ? otherAttrRole :
        attributeType === 'numeric' ? graphAttributeRole :
          otherAttributeType !== 'empty' ? otherAttrRole : graphAttributeRole
    dataConfig.setPrimaryRole(primaryRole)
    currentlyAssignedAttributeID !== attrID && dataConfig.setAttribute(graphAttributeRole, attrDescSnapshot)
    graphModel.setPlotType(plotChoices[attributeType][otherAttributeType])
    if (attributeType === 'numeric') {
      if (currentAxisType !== attributeType) {
        const newAxisModel = NumericAxisModel.create({place: axisPlace, min: 0, max: 1})
        graphModel.setAxis(axisPlace, newAxisModel as INumericAxisModel)
        layout.setAxisScale(axisPlace, scaleLinear())
        setNiceDomain(attribute?.numValues || [], newAxisModel)
      } else {
        setNiceDomain(attribute?.numValues || [], axisModel as INumericAxisModel)
      }
    } else if (attributeType === 'categorical') {
      const setOfValues = dataConfig.categorySetForAttrRole(graphAttributeRole)
      if (currentAxisType !== attributeType) {
        const newAxisModel = CategoricalAxisModel.create({place: axisPlace})
        graphModel.setAxis(axisPlace, newAxisModel as ICategoricalAxisModel)
        layout.setAxisScale(axisPlace, scaleBand())
      }
      layout.axisScale(axisPlace)?.domain(setOfValues)
    }
    else {  // attributeType is 'empty'
      if( currentAxisType !== attributeType) {
        const newAxisModel = EmptyAxisModel.create({place: axisPlace})
        graphModel.setAxis(axisPlace, newAxisModel as IEmptyAxisModel)
        layout.setAxisScale(axisPlace, scaleOrdinal())
      }
    }
  }

  setDotsRef(dotsRef: React.RefObject<SVGSVGElement>) {
    this.dotsRef = dotsRef
  }

}
