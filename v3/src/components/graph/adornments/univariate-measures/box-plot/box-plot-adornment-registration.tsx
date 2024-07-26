import React from "react"
import { FormControl, Checkbox } from "@chakra-ui/react"
import { t } from "../../../../../utilities/translation/translate"
import { getDocumentContentPropertyFromNode } from "../../../../../utilities/mst-utils"
import { registerAdornmentComponentInfo } from "../../adornment-component-info"
import { getAdornmentContentInfo, registerAdornmentContentInfo } from "../../adornment-content-info"
import { BoxPlotAdornmentModel, IBoxPlotAdornmentModel } from "./box-plot-adornment-model"
import { kBoxPlotClass, kBoxPlotLabelKey, kBoxPlotPrefix, kBoxPlotRedoAddKey, kBoxPlotRedoRemoveKey,
         kBoxPlotType, kBoxPlotUndoAddKey, kBoxPlotUndoRemoveKey } from "./box-plot-adornment-types"
import { useGraphContentModelContext } from "../../../hooks/use-graph-content-model-context"
import { BoxPlotAdornmentComponent } from "./box-plot-adornment-component"
import { observer } from "mobx-react-lite"

const Controls = observer(function Controls() {
  const graphModel = useGraphContentModelContext()
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

    if (checked) {
      graphModel.applyModelChange(
        () => adornmentsStore.addAdornment(adornment, graphModel.getUpdateCategoriesOptions()),
        {
          undoStringKey: undoRedoKeys.undoAdd || "",
          redoStringKey: undoRedoKeys.redoAdd || ""
        }
      )
    } else {
      graphModel.applyModelChange(
        () => adornmentsStore.hideAdornment(adornment.type),
        {
          undoStringKey: undoRedoKeys.undoRemove || "",
          redoStringKey: undoRedoKeys.redoRemove || ""
        }
      )
    }
  }

  const handleShowOutliersSetting = (checked: boolean) => {
    existingAdornment?.setShowOutliers(checked)
  }

  const handleShowIciSetting = (checked: boolean) => {
    existingAdornment?.setShowICI(checked)
  }

  const renderShowOutliers = () => {
    return (
      <FormControl isDisabled={!existingAdornment?.isVisible}>
        <Checkbox
          data-testid={`adornment-checkbox-${kBoxPlotClass}-show-outliers`}
          defaultChecked={existingAdornment?.showOutliers}
          onChange={e => handleShowOutliersSetting(e.target.checked)}
        >
          {t("DG.Inspector.graphBoxPlotShowOutliers")}
        </Checkbox>
      </FormControl>
    )
  }

  const renderShowICI = () => {
    if (showICIOption) {
      return (
        <FormControl isDisabled={!existingAdornment?.isVisible}>
          <Checkbox
            data-testid={`adornment-checkbox-${kBoxPlotClass}-show-outliers`}
            defaultChecked={existingAdornment?.showICI}
            onChange={e => handleShowIciSetting(e.target.checked)}
          >
            {t("DG.Inspector.graphBoxPlotShowICI")}
          </Checkbox>
        </FormControl>
      )
    }
  }

  return (
    <>
      <FormControl>
        <Checkbox
          data-testid={`adornment-checkbox-${kBoxPlotClass}`}
          defaultChecked={existingAdornment?.isVisible}
          onChange={e => handleBoxPlotSetting(e.target.checked)}
        >
          {t(kBoxPlotLabelKey)}
        </Checkbox>
      </FormControl>
      <div
        className="sub-options show-outliers"
        data-testid="adornment-show-outliers-options"
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
