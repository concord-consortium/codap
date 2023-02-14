import React from "react"
import {scaleBand, scaleLinear, scaleOrdinal} from "d3"
import {IGraphModel} from "./graph-model"
import {GraphLayout} from "./graph-layout"
import {IAttributeDescriptionSnapshot} from "./data-configuration-model"
import {IAttribute} from "../../../models/data/attribute"
import {IDataSet} from "../../../models/data/data-set"
import {AxisPlace} from "../../axis/axis-types"
import {
  CategoricalAxisModel, EmptyAxisModel, IAxisModel, IEmptyAxisModel, INumericAxisModel, NumericAxisModel
} from "../../axis/models/axis-model"
import {
  attrRoleToAxisPlace, axisPlaceToAttrRole, GraphAttrRole, GraphPlace, graphPlaceToAttrRole, PlotType
} from "../graphing-types"
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
    } else {
      // TODO, this may not be the reliable thing to test for AND/OR
      // we may need to be able to call setGraphProperties when axis' models are in place?
      if (!dotsRef.current) {
        graphModel.setGraphProperties({
          axes: {
            bottom: EmptyAxisModel.create({place: 'bottom'}),
            left: EmptyAxisModel.create({place: 'left'})
          }, plotType: 'casePlot'
        })
      } else {
        matchCirclesToData({
          dataConfiguration: dataConfig, dotsElement: dotsRef.current,
          pointRadius: graphModel.getPointRadius(), enableAnimation, instanceId,
          pointColor: graphModel.pointColor,
          pointStrokeColor: graphModel.pointStrokeColor
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
      if (['xAttr', 'yAttr', 'y2Attr', 'legendAttr'].includes(aKey)) {
        const match = aKey.match(/[a-z2]+/),
          attrRole = (match?.[0] ?? 'x') as GraphAttrRole,
          v2AttrArray = Array.isArray(links[aKey]) ? links[aKey] as any[] : [links[aKey]]
        v2AttrArray.forEach((aLink: IGuidLink<"DG.Attribute">, index: number) => {
          const attrV2ID = aLink.id,
            attrName = v2Document?.getAttribute(attrV2ID)?.object.name,
            attribute = dataset?.attrFromName(attrName),
            attrID = attribute?.id ?? '',
            attrSnapshot = {attributeID: attrID}
          if (index === 0) {
            graphModel.setAttributeID(attrRole, attrID)
            if (['x', 'y', 'rightNumeric'].includes(attrRole)) {
              attrTypes[attrRole] = attribute?.type ?? 'empty'
            }
          } else if (attrRole === 'y') {
            dataConfig.addYAttribute(attrSnapshot)
          }
        })
      }
    })
    graphModel.setPlotType(plotChoices[attrTypes.x][attrTypes.y])
    ;['x', 'y', 'rightNumeric'].forEach((attrRole: GraphAttrRole) => {
      const axisPlace = attrRoleToAxisPlace[attrRole],
        attrType = attrTypes[attrRole]
      if (axisPlace) {
        let axisModel
        switch (attrType) {
          case 'numeric':
            axisModel = NumericAxisModel.create({place: axisPlace, min: 0, max: 1})
            graphModel.setAxis(axisPlace, axisModel)
            setNiceDomain(dataConfig.numericValuesForAttrRole(attrRole), axisModel)
            layout.setAxisScale(axisPlace, scaleLinear().domain(axisModel.domain))
            break
          case 'categorical':
            axisModel = CategoricalAxisModel.create({place: axisPlace})
            graphModel.setAxis(axisPlace, axisModel)
            layout.setAxisScale(axisPlace,
              scaleBand().domain(dataConfig.categorySetForAttrRole(attrRole)))
            break
          default:  // Note that we never add an EmptyAxisModel to 'rightNumeric'
            if (axisPlace !== 'rightNumeric') {
              axisModel = EmptyAxisModel.create({place: axisPlace})
              graphModel.setAxis(axisPlace, axisModel)
              layout.setAxisScale(axisPlace, scaleOrdinal())
            }
        }
      }
    })
  }

  handleAttributeAssignment(graphPlace: GraphPlace, attrID: string) {
    if (['plot', 'legend'].includes(graphPlace)) {
      return  // Since there is no axis associated with the legend and the plotType will not change, we bail
    } else if (graphPlace === 'yPlus') {
      const yAxisModel = this.graphModel.getAxis('left')
      yAxisModel && setNiceDomain(this.graphModel.config.numericValuesForYAxis, yAxisModel)
      return
    }

    interface IAxisSetupProps {
      attr?: IAttribute,
      attrType: string,
      currentType?: string,
      place: AxisPlace,
      attrRole: GraphAttrRole,
      currAxisModel?: IAxisModel
    }

    const setupAxis = (props: IAxisSetupProps) => {
      const {attr, attrType, currentType, place, attrRole, currAxisModel} = props
      switch (attrType) {
        case 'numeric': {
          if (currentType !== 'numeric') {
            const newAxisModel = NumericAxisModel.create({place, min: 0, max: 1})
            graphModel.setAxis(place, newAxisModel)
            layout.setAxisScale(place, scaleLinear())
            setNiceDomain(attr?.numValues || [], newAxisModel)
          } else {
            setNiceDomain(attr?.numValues || [], currAxisModel as INumericAxisModel)
          }
        }
          break
        case 'categorical': {
          const setOfValues = dataConfig.categorySetForAttrRole(attrRole)
          if (currentType !== 'categorical') {
            const newAxisModel = CategoricalAxisModel.create({place})
            graphModel.setAxis(place, newAxisModel)
            layout.setAxisScale(place, scaleBand())
          }
          layout.getAxisScale(place)?.domain(setOfValues)
        }
          break
        case 'empty': {
          if (currentType !== 'empty') {
            layout.setAxisScale(place, scaleOrdinal())
            const newAxisModel = graphAttributeRole !== 'rightNumeric'
              ? EmptyAxisModel.create({place}) : undefined
            graphModel.setAxis(place, newAxisModel as IEmptyAxisModel)
          }
        }
      }
    }

    const {dataset, graphModel, layout} = this,
      dataConfig = graphModel.config,
      axisPlace = graphPlace as AxisPlace,
      graphAttributeRole = axisPlaceToAttrRole[axisPlace],
      attribute = dataset?.attrFromID(attrID),
      attributeType = dataConfig.attributeType(graphPlaceToAttrRole[graphPlace]) ?? 'empty',
      // rightNumeric only occurs in presence of scatterplot
      primaryType = graphPlace === 'rightNumeric' ? 'numeric' : attributeType,
      otherAxisPlace = axisPlace === 'bottom' ? 'left' : 'bottom',
      otherAttrRole = axisPlaceToAttrRole[otherAxisPlace],
      otherAttrID = graphModel.getAttributeID(axisPlaceToAttrRole[otherAxisPlace]),
      otherAttribute = dataset?.attrFromID(otherAttrID),
      otherAttributeType = otherAttribute?.type ?? 'empty',
      axisModel = graphModel.getAxis(axisPlace),
      otherAxisModel = graphModel.getAxis(otherAxisPlace),
      currentlyAssignedAttributeID = dataConfig.attributeID(graphAttributeRole),
      attrDescSnapshot: IAttributeDescriptionSnapshot = {attributeID: attrID},
      // Numeric attributes get priority for primaryRole when present. First one that is already present
      // and then the newly assigned one. If there is an already assigned categorical then its place is
      // the primaryRole, or, lastly, the newly assigned place
      primaryRole = otherAttributeType === 'numeric' ? otherAttrRole
        : attributeType === 'numeric' ? graphAttributeRole
          : otherAttributeType !== 'empty' ? otherAttrRole : graphAttributeRole
    dataConfig.setPrimaryRole(primaryRole)
    currentlyAssignedAttributeID !== attrID && dataConfig.setAttribute(graphAttributeRole, attrDescSnapshot)
    graphModel.setPlotType(plotChoices[primaryType][otherAttributeType])
    setupAxis({
      attr: attribute,
      attrType: attributeType,
      currentType: axisModel?.type,
      place: axisPlace,
      attrRole: graphAttributeRole,
      currAxisModel: graphModel.getAxis(axisPlace)
    })
    setupAxis({
      attr: otherAttribute,
      attrType: otherAttributeType,
      currentType: otherAxisModel?.type,
      place: otherAxisPlace,
      attrRole: otherAttrRole,
      currAxisModel: otherAxisModel
    })
  }

  setDotsRef(dotsRef: React.RefObject<SVGSVGElement>) {
    this.dotsRef = dotsRef
  }

}
