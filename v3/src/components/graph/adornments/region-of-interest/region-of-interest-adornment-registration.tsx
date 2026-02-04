import { registerAdornmentHandler } from "../../../../data-interactive/handlers/adornment-handler"
import { registerAdornmentComponentInfo } from "../adornment-component-info"
import { registerAdornmentContentInfo } from "../adornment-content-info"
import { AdornmentCheckbox } from "../components/adornment-checkbox"
import { RegionOfInterestAdornment } from "./region-of-interest-adornment-component"
import { regionOfInterestAdornmentHandler } from "./region-of-interest-adornment-handler"
import { RegionOfInterestAdornmentModel } from "./region-of-interest-adornment-model"
import {
  kRegionOfInterestClass, kRegionOfInterestLabelKey, kRegionOfInterestPrefix, kRegionOfInterestType,
  kRegionOfInterestUndoAddKey, kRegionOfInterestRedoAddKey, kRegionOfInterestUndoRemoveKey,
  kRegionOfInterestRedoRemoveKey
} from "./region-of-interest-adornment-types"

const Controls = () => {
  return (
    <AdornmentCheckbox
      classNameValue={kRegionOfInterestClass}
      labelKey={kRegionOfInterestLabelKey}
      type={kRegionOfInterestType}
    />
  )
}

registerAdornmentContentInfo({
  type: kRegionOfInterestType,
  plots: ["casePlot", "dotChart", "dotPlot", "scatterPlot"],
  prefix: kRegionOfInterestPrefix,
  modelClass: RegionOfInterestAdornmentModel,
  undoRedoKeys: {
    undoAdd: kRegionOfInterestUndoAddKey,
    redoAdd: kRegionOfInterestRedoAddKey,
    undoRemove: kRegionOfInterestUndoRemoveKey,
    redoRemove: kRegionOfInterestRedoRemoveKey
  }
})

registerAdornmentComponentInfo({
  adornmentEltClass: kRegionOfInterestClass,
  Component: RegionOfInterestAdornment,
  Controls,
  labelKey: kRegionOfInterestLabelKey,
  order: 10,
  type: kRegionOfInterestType
})

registerAdornmentHandler(kRegionOfInterestType, regionOfInterestAdornmentHandler)
