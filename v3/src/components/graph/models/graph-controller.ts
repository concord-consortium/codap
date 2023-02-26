import React from "react"
import {IGraphModel} from "./graph-model"
import {GraphLayout} from "./graph-layout"
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
import {scaleTypeToD3Scale} from "./multi-scale"
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
          layout.setAxisScaleType(axisPlace, axisModel.scale)
          if (isNumericAxisModel(axisModel)) {
            axisScale.domain(axisModel.domain)
          } else if (isCategoricalAxisModel(axisModel)) {
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
      attrTypes: Record<string, string> = {x: 'empty', y: 'empty', legend: 'empty'},
      attrRoles = ['x', 'y', 'rightNumeric', 'topSplit', 'rightSplit', 'legend']
    Object.keys(links).forEach((aKey: keyof typeof links) => {
      if (['xAttr', 'yAttr', 'y2Attr', 'legendAttr', 'topAttr', 'rightAttr'].includes(aKey)) {
        const match = aKey.match(/[a-z2]+/),
          attrKey = match?.[0],
          attrRole = ((attrKey === 'top' ? 'topSplit'
            : attrKey === 'right' ? 'rightSplit' : attrKey) ?? 'x') as GraphAttrRole,
          v2AttrArray = Array.isArray(links[aKey]) ? links[aKey] as any[] : [links[aKey]]
        v2AttrArray.forEach((aLink: IGuidLink<"DG.Attribute">, index: number) => {
          const attrV2ID = aLink.id,
            attrName = v2Document?.getAttribute(attrV2ID)?.object.name,
            attribute = dataset?.attrFromName(attrName),
            attrID = attribute?.id ?? '',
            attrSnapshot = {attributeID: attrID}
          if (index === 0) {
            graphModel?.setAttributeID(attrRole, attrID)
            if (attrRoles.includes(attrRole)) {
              attrTypes[attrRole] = attribute?.type ?? 'empty'
            }
          } else if (attrRole === 'y') {
            dataConfig?.addYAttribute(attrSnapshot)
          }
        })
      }
    })
    graphModel?.setPlotType(plotChoices[attrTypes.x][attrTypes.y])
    attrRoles.forEach((attrRole: GraphAttrRole) => {
      const axisPlace = attrRoleToAxisPlace[attrRole],
        attrType = attrTypes[attrRole]
      if (axisPlace) {
        let axisModel
        switch (attrType) {
          case 'numeric':
            axisModel = NumericAxisModel.create({place: axisPlace, min: 0, max: 1})
            graphModel?.setAxis(axisPlace, axisModel)
            setNiceDomain(dataConfig?.numericValuesForAttrRole(attrRole) ?? [], axisModel)
            layout.setAxisScaleType(axisPlace, 'linear')
            layout?.getAxisScale(axisPlace)?.setDomain(axisModel.domain)
            break
          case 'categorical':
            axisModel = CategoricalAxisModel.create({place: axisPlace})
            graphModel?.setAxis(axisPlace, axisModel)
            layout.setAxisScaleType(axisPlace, 'band')
            layout?.getAxisScale(axisPlace)?.setDomain(dataConfig?.categorySetForAttrRole(attrRole) ?? [])
            break
          default:  // Only add empty axes to 'left' and 'bottom'
            if (['left', 'bottom'].includes(axisPlace)) {
              axisModel = EmptyAxisModel.create({place: axisPlace})
              graphModel?.setAxis(axisPlace, axisModel)
              layout?.setAxisScaleType(axisPlace, 'ordinal')
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
        graphAttributeRole = axisPlaceToAttrRole[axisPlace]
      if (['left', 'bottom'].includes(axisPlace)) { // Only assignment to 'left' and 'bottom' change plotType
        const attributeType = dataConfig.attributeType(graphPlaceToAttrRole[graphPlace]) ?? 'empty',
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
        graphModel.setPlotType(plotChoices[primaryType][otherAttributeType])
      }
      if (dataConfig.attributeID(graphAttributeRole) !== attrID) {
        dataConfig.setAttribute(graphAttributeRole, {attributeID: attrID})
      }
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
            layout.setAxisScaleType(place, 'linear')
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
            layout.setAxisScaleType(place, 'band')
          }
          layout.getAxisScale(place)?.setDomain(setOfValues)
        }
          break
        case 'empty': {
          if (currentType !== 'empty') {
            layout.setAxisScaleType(place, 'ordinal')
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
