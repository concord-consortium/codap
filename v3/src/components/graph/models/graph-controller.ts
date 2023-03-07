import React from "react"
import {scaleBand, scaleLinear, scaleOrdinal} from "d3"
import {IGraphModel} from "./graph-model"
import {GraphLayout, scaleTypeToD3Scale} from "./graph-layout"
import {IDataSet} from "../../../models/data/data-set"
import {AxisPlace, AxisPlaces} from "../../axis/axis-types"
import {
  CategoricalAxisModel,
  EmptyAxisModel,
  IEmptyAxisModel,
  INumericAxisModel,
  isCategoricalAxisModel,
  isNumericAxisModel,
  NumericAxisModel
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

interface IGraphControllerConstructorProps {
  layout: GraphLayout
  enableAnimation: React.MutableRefObject<boolean>
  dotsRef: React.RefObject<SVGSVGElement>
  instanceId: string
}

interface IGraphControllerProps {
  graphModel: IGraphModel
  dataset: IDataSet | undefined
}

export class GraphController {
  graphModel?: IGraphModel
  layout: GraphLayout
  dataset?: IDataSet
  enableAnimation: React.MutableRefObject<boolean>
  dotsRef: React.RefObject<SVGSVGElement>
  instanceId: string

  constructor({layout, enableAnimation, dotsRef, instanceId}: IGraphControllerConstructorProps) {
    this.layout = layout
    this.instanceId = instanceId
    this.enableAnimation = enableAnimation
    this.dotsRef = dotsRef
  }

  setProperties(props: IGraphControllerProps) {
    this.graphModel = props.graphModel
    this.dataset = props.dataset
    if (this.graphModel.config.dataset !== props.dataset) {
      this.graphModel.config.setDataset(props.dataset)
    }
    this.initializeGraph()
  }

  initializeGraph() {
    const {graphModel, dotsRef, enableAnimation, instanceId, layout} = this,
      dataConfig = graphModel?.config
    if (dataConfig && layout && dotsRef.current) {
      AxisPlaces.forEach((axisPlace: AxisPlace) => {
        const axisModel = graphModel.getAxis(axisPlace),
          attrRole = axisPlaceToAttrRole[axisPlace]
        if (axisModel) {
          const axisScale = scaleTypeToD3Scale(axisModel.scale)
          layout.setAxisScale(axisPlace, axisScale)
          if (isNumericAxisModel(axisModel)) {
            axisScale.domain(axisModel.domain)
          }
          else if (isCategoricalAxisModel(axisModel)) {
            axisScale.domain(graphModel.config.categorySetForAttrRole(attrRole))
          }
        }
      })
      matchCirclesToData({
        dataConfiguration: dataConfig, dotsElement: dotsRef.current,
        pointRadius: graphModel.getPointRadius(), enableAnimation, instanceId,
        pointColor: graphModel.pointColor,
        pointStrokeColor: graphModel.pointStrokeColor
      })
    }
  }

  processV2Document(v2Document: CodapV2Document) {
    const {graphModel, layout, /*dotsRef, enableAnimation,*/ dataset} = this,
      dataConfig = graphModel?.config,
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
            graphModel?.setAttributeID(attrRole, attrID)
            if (['x', 'y', 'rightNumeric'].includes(attrRole)) {
              attrTypes[attrRole] = attribute?.type ?? 'empty'
            }
          } else if (attrRole === 'y') {
            dataConfig?.addYAttribute(attrSnapshot)
          }
        })
      }
    })
    graphModel?.setPlotType(plotChoices[attrTypes.x][attrTypes.y])
    ;['x', 'y', 'rightNumeric'].forEach((attrRole: GraphAttrRole) => {
      const axisPlace = attrRoleToAxisPlace[attrRole],
        attrType = attrTypes[attrRole]
      if (axisPlace) {
        let axisModel
        switch (attrType) {
          case 'numeric':
            axisModel = NumericAxisModel.create({place: axisPlace, min: 0, max: 1})
            graphModel?.setAxis(axisPlace, axisModel)
            setNiceDomain(dataConfig?.numericValuesForAttrRole(attrRole) ?? [], axisModel)
            layout?.setAxisScale(axisPlace, scaleLinear().domain(axisModel.domain))
            break
          case 'categorical':
            axisModel = CategoricalAxisModel.create({place: axisPlace})
            graphModel?.setAxis(axisPlace, axisModel)
            layout?.setAxisScale(axisPlace,
              scaleBand().domain(dataConfig?.categorySetForAttrRole(attrRole) ?? []))
            break
          default:  // Note that we never add an EmptyAxisModel to 'rightNumeric'
            if (axisPlace !== 'rightNumeric') {
              axisModel = EmptyAxisModel.create({place: axisPlace})
              graphModel?.setAxis(axisPlace, axisModel)
              layout?.setAxisScale(axisPlace, scaleOrdinal())
            }
        }
      }
    })
  }

  handleAttributeAssignment(graphPlace: GraphPlace, attrID: string) {
    const {graphModel, layout, dataset} = this,
      dataConfig = graphModel?.config
    if (!(graphModel && layout && dataset && dataConfig)) {
      return
    }
    if (['plot', 'legend'].includes(graphPlace)) {
      // Since there is no axis associated with the legend and the plotType will not change, we bail
      return
    } else if (graphPlace === 'yPlus') {
      // The yPlus attribute utilizes the left numeric axis for plotting but doesn't change anything else
      const yAxisModel = graphModel.getAxis('left')
      yAxisModel && setNiceDomain(dataConfig.numericValuesForYAxis, yAxisModel)
      return
    }

    const setPrimaryRoleAndPlotType = () => {
      const axisPlace = graphPlace as AxisPlace,
        graphAttributeRole = axisPlaceToAttrRole[axisPlace],
        attributeType = dataConfig.attributeType(graphPlaceToAttrRole[graphPlace]) ?? 'empty',
        // rightNumeric only occurs in presence of scatterplot
        primaryType = graphPlace === 'rightNumeric' ? 'numeric' : attributeType,
        otherAxisPlace = axisPlace === 'bottom' ? 'left' : 'bottom',
        otherAttrRole = axisPlaceToAttrRole[otherAxisPlace],
        otherAttributeType = dataConfig.attributeType(graphPlaceToAttrRole[otherAxisPlace]) ?? 'empty',
        // Numeric attributes get priority for primaryRole when present. First one that is already present
        // and then the newly assigned one. If there is an already assigned categorical then its place is
        // the primaryRole, or, lastly, the newly assigned place
        primaryRole = otherAttributeType === 'numeric' ? otherAttrRole
          : attributeType === 'numeric' ? graphAttributeRole
            : otherAttributeType !== 'empty' ? otherAttrRole : graphAttributeRole
      dataConfig.setPrimaryRole(primaryRole)
      if (dataConfig.attributeID(graphAttributeRole) !== attrID) {
        dataConfig.setAttribute(graphAttributeRole, {attributeID: attrID})
      }
      graphModel.setPlotType(plotChoices[primaryType][otherAttributeType])
    }

    const setupAxis = (place: AxisPlace) => {
      const attrRole = graphPlaceToAttrRole[place],
        attributeID = dataConfig.attributeID(attrRole),
        attr = dataset?.attrFromID(attributeID),
        attrType = dataConfig.attributeType(attrRole) ?? 'empty',
        currAxisModel = graphModel.getAxis(place),
        currentType = currAxisModel?.type ?? 'empty'
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
            const newAxisModel = attrRole !== 'rightNumeric'
              ? EmptyAxisModel.create({place}) : undefined
            graphModel.setAxis(place, newAxisModel as IEmptyAxisModel)
          }
        }
      }
    }

    setPrimaryRoleAndPlotType()
    AxisPlaces.forEach(setupAxis)
  }
}
