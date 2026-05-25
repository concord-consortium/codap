import { observer } from "mobx-react-lite"
import { registerAdornmentHandler } from "../../../../../data-interactive/handlers/adornment-handler"
import { useTileModelContext } from "../../../../../hooks/use-tile-model-context"
import { logMessageWithReplacement } from "../../../../../lib/log-message"
import { updateTileNotification } from "../../../../../models/tiles/tile-notifications"
import { getDocumentContentPropertyFromNode } from "../../../../../utilities/mst-utils"
import { t } from "../../../../../utilities/translation/translate"
import { PaletteCheckbox } from "../../../../palette-checkbox"
import {
  toggleShowICINotification, toggleShowOutliersNotification
} from "../../../graph-notifications"
import { useGraphContentModelContext } from "../../../hooks/use-graph-content-model-context"
import { registerAdornmentComponentInfo } from "../../adornment-component-info"
import { getAdornmentContentInfo, registerAdornmentContentInfo } from "../../adornment-content-info"
import { exportUnivariateMeasure } from "../univariate-measure-adornment-utils"
import { BoxPlotAdornmentComponent } from "./box-plot-adornment-component"
import { boxPlotAdornmentHandler } from "./box-plot-adornment-handler"
import { BoxPlotAdornmentModel, IBoxPlotAdornmentModel, isBoxPlotAdornment } from "./box-plot-adornment-model"
import {
  kBoxPlotClass, kBoxPlotLabelKey, kBoxPlotPrefix, kBoxPlotRedoAddKey, kBoxPlotRedoRemoveKey,
  kBoxPlotType, kBoxPlotUndoAddKey, kBoxPlotUndoRemoveKey
} from "./box-plot-adornment-types"

const Controls = observer(function Controls() {
  const graphModel = useGraphContentModelContext()
  const { tile } = useTileModelContext()
  const adornmentsStore = graphModel.adornmentsStore
  const existingAdornment = adornmentsStore.findAdornmentOfType<IBoxPlotAdornmentModel>(kBoxPlotType)
  const showICIOption = getDocumentContentPropertyFromNode(graphModel, "iciEnabled") || existingAdornment?.showICI

  const handleBoxPlotSetting = (checked: boolean) => {
    const existingBoxPlotAdornment = adornmentsStore.findAdornmentOfType<IBoxPlotAdornmentModel>(kBoxPlotType)
    const componentContentInfo = getAdornmentContentInfo(kBoxPlotType)
    const adornment = existingBoxPlotAdornment ?? componentContentInfo.modelClass.create() as IBoxPlotAdornmentModel
    const undoRedoKeys = {
      undoAdd: componentContentInfo.undoRedoKeys?.undoAdd,
      redoAdd: componentContentInfo.undoRedoKeys?.redoAdd,
      undoRemove: componentContentInfo.undoRedoKeys?.undoRemove,
      redoRemove: componentContentInfo.undoRedoKeys?.redoRemove
    }
    // V2 op: `togglePlottedBoxPlot` (univariate_adornment_base_model.js toggleAverage ~:321).
    const notify = tile
      ? () => updateTileNotification("togglePlottedBoxPlot", { isChecked: checked }, tile)
      : undefined

    if (checked) {
      graphModel.applyModelChange(
        () => adornmentsStore.addAdornment(adornment, graphModel.getUpdateCategoriesOptions()), {
          notify,
          undoStringKey: undoRedoKeys.undoAdd || "",
          redoStringKey: undoRedoKeys.redoAdd || "",
          log: logMessageWithReplacement("Added %@", {adornmentType: adornment.type})
        }
      )
    } else {
      graphModel.applyModelChange(
        () => adornmentsStore.hideAdornment(adornment.type), {
          notify,
          undoStringKey: undoRedoKeys.undoRemove || "",
          redoStringKey: undoRedoKeys.redoRemove || "",
          log: logMessageWithReplacement("Removed %@", {adornmentType: adornment.type})
        }
      )
    }
  }

  const handleShowOutliersSetting = (checked: boolean) => {
    // V3 pre-existing bug: this previously bypassed applyModelChange (no undo/redo/log).
    // Wrap now so the toggle is undoable AND so V2 plugins see `toggle show outliers`.
    graphModel.applyModelChange(() => existingAdornment?.setShowOutliers(checked), {
      notify: () => toggleShowOutliersNotification(tile, checked),
      undoStringKey: checked ? "DG.Undo.graph.showOutliers" : "DG.Undo.graph.hideOutliers",
      redoStringKey: checked ? "DG.Redo.graph.showOutliers" : "DG.Redo.graph.hideOutliers",
      log: logMessageWithReplacement("%@ outliers", {action: checked ? "Show" : "Hide"})
    })
  }

  const handleShowIciSetting = (checked: boolean) => {
    // V3 pre-existing bug: this previously bypassed applyModelChange. Wrap and emit the V3-clarified
    // op `toggle show ICI` (V2 emits the wrong `toggle show outliers` op here — audit §3.5 bug).
    graphModel.applyModelChange(() => existingAdornment?.setShowICI(checked), {
      notify: () => toggleShowICINotification(tile, checked),
      undoStringKey: checked ? "V3.Undo.graph.showICI" : "V3.Undo.graph.hideICI",
      redoStringKey: checked ? "V3.Redo.graph.showICI" : "V3.Redo.graph.hideICI",
      log: logMessageWithReplacement("%@ ICI", {action: checked ? "Show" : "Hide"})
    })
  }

  const renderShowOutliers = () => {
    return (
      <PaletteCheckbox
        data-testid={`adornment-checkbox-${kBoxPlotClass}-show-outliers`}
        isSelected={existingAdornment?.showOutliers}
        isDisabled={!existingAdornment?.isVisible}
        onChange={handleShowOutliersSetting}
      >
        {t("DG.Inspector.graphBoxPlotShowOutliers")}
      </PaletteCheckbox>
    )
  }

  const renderShowICI = () => {
    if (showICIOption) {
      return (
        <PaletteCheckbox
          data-testid={`adornment-checkbox-${kBoxPlotClass}-show-ici`}
          isSelected={existingAdornment?.showICI}
          isDisabled={!existingAdornment?.isVisible}
          onChange={handleShowIciSetting}
        >
          {t("DG.Inspector.graphBoxPlotShowICI")}
        </PaletteCheckbox>
      )
    }
  }

  return (
    <>
      <PaletteCheckbox
        data-testid={`adornment-checkbox-${kBoxPlotClass}`}
        isSelected={existingAdornment?.isVisible}
        onChange={handleBoxPlotSetting}
      >
        {t(kBoxPlotLabelKey)}
      </PaletteCheckbox>
      <div
        className="sub-options show-outliers"
        data-testid="adornment-show-outliers-options"
        role="group"
        aria-label={t(kBoxPlotLabelKey)}
      >
        {renderShowOutliers()}
        {renderShowICI()}
      </div>
    </>
  )
})

registerAdornmentContentInfo({
  type: kBoxPlotType,
  parentType: "Univariate Measure",
  plots: ["dotPlot"],
  prefix: kBoxPlotPrefix,
  modelClass: BoxPlotAdornmentModel,
  undoRedoKeys: {
    undoAdd: kBoxPlotUndoAddKey,
    redoAdd: kBoxPlotRedoAddKey,
    undoRemove: kBoxPlotUndoRemoveKey,
    redoRemove: kBoxPlotRedoRemoveKey,
  },
  exporter: (model, options) => {
    const adornment = isBoxPlotAdornment(model) ? model : undefined
    return adornment
            ? {
                plottedBoxPlot: {
                  ...exportUnivariateMeasure(adornment, options),
                  showOutliers: adornment.showOutliers,
                  showICI: adornment.showICI
                }
              }
            : undefined
  }
})

registerAdornmentComponentInfo({
  adornmentEltClass: kBoxPlotClass,
  Component: BoxPlotAdornmentComponent,
  Controls,
  labelKey: kBoxPlotLabelKey,
  order: 10,
  type: kBoxPlotType
})

registerAdornmentHandler(kBoxPlotType, boxPlotAdornmentHandler)
