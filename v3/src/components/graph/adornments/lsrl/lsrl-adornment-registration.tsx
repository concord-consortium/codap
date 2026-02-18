import { FormControl, Checkbox } from "@chakra-ui/react"
import { observer } from "mobx-react-lite"
import { registerAdornmentHandler } from "../../../../data-interactive/handlers/adornment-handler"
import { logMessageWithReplacement } from "../../../../lib/log-message"
import { t } from "../../../../utilities/translation/translate"
import { useGraphContentModelContext } from "../../hooks/use-graph-content-model-context"
import { registerAdornmentComponentInfo } from "../adornment-component-info"
import { exportAdornmentBase, getAdornmentContentInfo, registerAdornmentContentInfo } from "../adornment-content-info"
import { LSRLAdornment } from "./lsrl-adornment-component"
import { lsrlAdornmentHandler } from "./lsrl-adornment-handler"
import { ILSRLAdornmentModel, isLSRLAdornment, LSRLAdornmentModel } from "./lsrl-adornment-model"
import {
  kLSRLClass, kLSRLLabelKey, kLSRLPrefix, kLSRLRedoAddKey, kLSRLRedoRemoveKey, kLSRLType,
  kLSRLUndoAddKey, kLSRLUndoRemoveKey
} from "./lsrl-adornment-types"

function logLSRLToggle(action: "hide" | "show") {
  return logMessageWithReplacement("toggleLSRL %@", { action })
}

const Controls = observer(function Controls() {
  const graphModel = useGraphContentModelContext()
  const adornmentsStore = graphModel.adornmentsStore
  const existingAdornment = adornmentsStore.findAdornmentOfType<ILSRLAdornmentModel>(kLSRLType)
  const interceptLocked = adornmentsStore?.interceptLocked

  const handleLSRLSetting = (checked: boolean) => {
    const existingLSRLAdornment = adornmentsStore.findAdornmentOfType<ILSRLAdornmentModel>(kLSRLType)
    const componentContentInfo = getAdornmentContentInfo(kLSRLType)
    const adornment = existingLSRLAdornment ?? componentContentInfo.modelClass.create() as ILSRLAdornmentModel
    const undoRedoKeys = {
      undoAdd: componentContentInfo.undoRedoKeys?.undoAdd,
      redoAdd: componentContentInfo.undoRedoKeys?.redoAdd,
      undoRemove: componentContentInfo.undoRedoKeys?.undoRemove,
      redoRemove: componentContentInfo.undoRedoKeys?.redoRemove
    }

    if (checked) {
      graphModel.applyModelChange(
        () => adornmentsStore.addAdornment(adornment, graphModel.getUpdateCategoriesOptions()),
        {
          undoStringKey: undoRedoKeys.undoAdd || "",
          redoStringKey: undoRedoKeys.redoAdd || "",
          log: logLSRLToggle("show")
        }
      )
    } else {
      graphModel.applyModelChange(
        () => adornmentsStore.hideAdornment(adornment.type),
        {
          undoStringKey: undoRedoKeys.undoRemove || "",
          redoStringKey: undoRedoKeys.redoRemove || "",
          log: logLSRLToggle("hide")
        }
      )
    }
  }

  const handleShowConfidenceBandsSetting = (checked: boolean) => {
    graphModel.applyModelChange(
      () => existingAdornment?.setShowConfidenceBands(checked),
      {
        undoStringKey: checked
          ? "V3.Undo.graph.showConfidenceBands"
          : "V3.Undo.graph.hideConfidenceBands",
        redoStringKey: checked
          ? "V3.Redo.graph.showConfidenceBands"
          : "V3.Redo.graph.hideConfidenceBands"
      }
    )
  }

  return (
    <>
      <FormControl>
        <Checkbox
          data-testid={`adornment-checkbox-${kLSRLClass}`}
          defaultChecked={existingAdornment?.isVisible}
          onChange={e => handleLSRLSetting(e.target.checked)}
        >
          {t(kLSRLLabelKey)}
        </Checkbox>
      </FormControl>
      <div
        className="sub-options show-confidence-bands"
        data-testid="adornment-show-confidence-bands-options"
      >
        <FormControl isDisabled={!existingAdornment?.isVisible || interceptLocked}>
          <Checkbox
            data-testid={`adornment-checkbox-${kLSRLClass}-show-confidence-bands`}
            defaultChecked={existingAdornment?.showConfidenceBands}
            onChange={e => handleShowConfidenceBandsSetting(e.target.checked)}
          >
            {t("V3.Inspector.graphLSRLShowConfidenceBands")}
          </Checkbox>
        </FormControl>
      </div>
    </>
  )
})

registerAdornmentContentInfo({
  type: kLSRLType,
  plots: ['scatterPlot'],
  prefix: kLSRLPrefix,
  modelClass: LSRLAdornmentModel,
  undoRedoKeys: {
    undoAdd: kLSRLUndoAddKey,
    redoAdd: kLSRLRedoAddKey,
    undoRemove: kLSRLUndoRemoveKey,
    redoRemove: kLSRLRedoRemoveKey
  },
  exporter: (model, options) => {
    const adornment = isLSRLAdornment(model) ? model : undefined
    if (!adornment) return undefined
    return {
      isLSRLVisible: adornment.isVisible,
      multipleLSRLsStorage: {
        ...exportAdornmentBase(adornment, options),
        isInterceptLocked: options.isInterceptLocked,
        showSumSquares: options.showSumSquares,
        showConfidenceBands: adornment.showConfidenceBands,
        // v2 ignores top and right splits
        lsrls: options.legendCategories.map(cat => {
          const labelInstance = adornment.firstLabelInstance(cat)
          return {
            ...exportAdornmentBase(adornment, options),
            equationCoords: labelInstance?.v2ExportCoords ?? null,
            isInterceptLocked: options.isInterceptLocked,
            showConfidenceBands: adornment.showConfidenceBands
          }
        })
      }
    }
  }
})

registerAdornmentComponentInfo({
  adornmentEltClass: kLSRLClass,
  Component: LSRLAdornment,
  Controls,
  labelKey: kLSRLLabelKey,
  order: 20,
  type: kLSRLType
})

registerAdornmentHandler(kLSRLType, lsrlAdornmentHandler)
