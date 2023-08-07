import { registerAdornmentComponentInfo } from "../adornment-component-info"
import { registerAdornmentContentInfo } from "../adornment-content-info"
import { CountModel } from "./count-model"
import { kCountClass, kCountLabelKey, kCountPrefix, kCountType } from "./count-types"
import { Count } from "./count"

registerAdornmentContentInfo({
  type: kCountType,
  plots: ["casePlot", "dotChart", "dotPlot", "scatterPlot"],
  prefix: kCountPrefix,
  modelClass: CountModel
})

registerAdornmentComponentInfo({
  adornmentEltClass: kCountClass,
  Component: Count,
  labelKey: kCountLabelKey,
  order: 10,
  type: kCountType
})
