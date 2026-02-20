import { FormControl, Checkbox } from "@chakra-ui/react"
import { observer } from "mobx-react-lite"
import { registerAdornmentHandler } from "../../../../data-interactive/handlers/adornment-handler"
import { logMessageWithReplacement } from "../../../../lib/log-message"
import { t } from "../../../../utilities/translation/translate"
import { If } from "../../../common/if"
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

  const handleShowRSetting = (checked: boolean) => {
    graphModel.applyModelChange(
      () => existingAdornment?.setShowR(checked),
      {
        undoStringKey: checked ? "V3.Undo.graph.showR" : "V3.Undo.graph.hideR",
        redoStringKey: checked ? "V3.Redo.graph.showR" : "V3.Redo.graph.hideR"
      }
    )
  }

  const handleShowRSquaredSetting = (checked: boolean) => {
    graphModel.applyModelChange(
      () => existingAdornment?.setShowRSquared(checked),
      {
        undoStringKey: checked ? "V3.Undo.graph.showRSquared" : "V3.Undo.graph.hideRSquared",
        redoStringKey: checked ? "V3.Redo.graph.showRSquared" : "V3.Redo.graph.hideRSquared"
      }
    )
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
      <If condition={!!existingAdornment?.isVisible}>
        <div
          className="sub-options lsrl-sub-options"
          data-testid="adornment-lsrl-sub-options"
        >
          <If condition={!interceptLocked}>
            <FormControl>
              <Checkbox
                data-testid={`adornment-checkbox-${kLSRLClass}-show-r`}
                defaultChecked={existingAdornment?.showR}
                onChange={e => handleShowRSetting(e.target.checked)}
              >
                {t("V3.graphLSRL.showR")}
              </Checkbox>
            </FormControl>
            <FormControl>
              <Checkbox
                data-testid={`adornment-checkbox-${kLSRLClass}-show-r-squared`}
                defaultChecked={existingAdornment?.showRSquared}
                onChange={e => handleShowRSquaredSetting(e.target.checked)}
              >
                {t("V3.graphLSRL.showRSquared")}
              </Checkbox>
            </FormControl>
            <FormControl>
              <Checkbox
                data-testid={`adornment-checkbox-${kLSRLClass}-show-confidence-bands`}
                defaultChecked={existingAdornment?.showConfidenceBands}
                onChange={e => handleShowConfidenceBandsSetting(e.target.checked)}
              >
                {t("V3.Inspector.graphLSRLShowConfidenceBands")}
              </Checkbox>
            </FormControl>
          </If>
        </div>
      </If>
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
        v3: {
          showR: adornment.showR,
          showRSquared: adornment.showRSquared,
        },
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
