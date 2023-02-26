import {AxisPlace, AxisScaleType} from "../../axis/axis-types"
import {attrRoleToAxisPlace, GraphAttrRole} from "../graphing-types"
import {IDataConfigurationModel} from "../models/data-configuration-model"
import {GraphLayout} from "../models/graph-layout"

export interface DimensionInfo {
  place: AxisPlace
  role: GraphAttrRole
  attrID: string
  scale?: AxisScaleType
  hasAttr: boolean
}

interface IRoleAndRef {
  role: GraphAttrRole,
  ref: React.MutableRefObject<DimensionInfo | undefined>
}

interface IFillOutDimensionRefs {
  dataConfiguration?: IDataConfigurationModel
  layout: GraphLayout
  primary: IRoleAndRef
  secondary?: IRoleAndRef // optional because it's not used by scatterplot
  extraPrimary: IRoleAndRef
  extraSecondary: IRoleAndRef
}

export const fillOutDimensionRefs = (
  {dataConfiguration, layout,
    primary, secondary,
    extraPrimary, extraSecondary}:IFillOutDimensionRefs) => {

  const fillOutDimensionInfo = (role: GraphAttrRole) => {
      const place = attrRoleToAxisPlace[role] ?? 'bottom',
        attrID = dataConfiguration?.attributeID(role) ?? '',
        scale = layout.getAxisScale(place)?.scale,
        hasAttr = !!attrID
      return {place, role, attrID, scale, hasAttr}
    }

    primary.ref.current = fillOutDimensionInfo(primary.role)
    if (secondary) secondary.ref.current = fillOutDimensionInfo(secondary.role)
    extraPrimary.ref.current = fillOutDimensionInfo(extraPrimary.role)
    extraSecondary.ref.current = fillOutDimensionInfo(extraSecondary.role)
}
