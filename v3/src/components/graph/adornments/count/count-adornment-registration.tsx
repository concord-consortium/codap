import React, { useState } from "react"
import { FormControl, Checkbox, RadioGroup, Radio } from "@chakra-ui/react"
import { registerAdornmentHandler } from "../../../../data-interactive/handlers/adornment-handler"
import { logMessageWithReplacement } from "../../../../lib/log-message"
import { t } from "../../../../utilities/translation/translate"
import { useGraphContentModelContext } from "../../hooks/use-graph-content-model-context"
import { useGraphDataConfigurationContext } from "../../hooks/use-graph-data-configuration-context"
import { registerAdornmentComponentInfo } from "../adornment-component-info"
import {
  exportAdornmentBase, getAdornmentContentInfo, IAdornmentExporterOptions, registerAdornmentContentInfo
} from "../adornment-content-info"
import { IAdornmentModel } from "../adornment-models"
import { CountAdornment } from "./count-adornment-component"
import { countAdornmentHandler } from "./count-adornment-handler"
import { CountAdornmentModel, ICountAdornmentModel, isCountAdornment, PercentType } from "./count-adornment-model"
import { kCountClass, kCountLabelKey, kCountPrefix, kCountType, kPercentLabelKey } from "./count-adornment-types"

const Controls = () => {
  const graphModel = useGraphContentModelContext()
  const dataConfig = useGraphDataConfigurationContext()
  const adornmentsStore = graphModel.adornmentsStore
  const existingAdornment = adornmentsStore.findAdornmentOfType<ICountAdornmentModel>(kCountType)
  const leftBottomCategoricalAttrCount = dataConfig?.leftBottomCategoricalAttrCount ?? 0
  const shouldShowPercentOption = leftBottomCategoricalAttrCount || adornmentsStore.subPlotsHaveRegions ||
                                  graphModel.plotType === "binnedDotPlot"
  const shouldShowPercentTypeOptions = leftBottomCategoricalAttrCount > 1
  const [enablePercentOptions, setEnablePercentOptions] = useState(existingAdornment?.showPercent)
  const [percentTypeValue, setPercentTypeValue] = useState(
    existingAdornment && isCountAdornment(existingAdornment) ? existingAdornment.percentType : "row"
  )

  const handleShowPercent = (adornment: ICountAdornmentModel, checked: boolean) => {
    adornment.setShowPercent(checked)
    setEnablePercentOptions(checked)
  }

  const handleSetting = (checked: boolean, checkBoxType: string) => {
    const existingCountAdornment = adornmentsStore.findAdornmentOfType<ICountAdornmentModel>(kCountType)
    const componentContentInfo = getAdornmentContentInfo(kCountType)
    const adornment = existingCountAdornment ?? componentContentInfo.modelClass.create() as ICountAdornmentModel
    const undoAddKey = checkBoxType === "count" ? "DG.Undo.graph.showCount" : "DG.Undo.graph.showPercent"
    const redoAddKey = checkBoxType === "count" ? "DG.Redo.graph.showCount" : "DG.Redo.graph.showPercent"
    const undoRemoveKey = checkBoxType === "count" ? "DG.Undo.graph.hideCount" : "DG.Undo.graph.hidePercent"
    const redoRemoveKey = checkBoxType === "count" ? "DG.Redo.graph.hideCount" : "DG.Redo.graph.hidePercent"

    const setShowAdornment = checkBoxType === "count"
      ? () => adornment.setShowCount(checked)
      : () => handleShowPercent(adornment, checked)

    if (checked) {
      graphModel.applyModelChange(
        () => {
          adornmentsStore.addAdornment(adornment, graphModel.getUpdateCategoriesOptions())
          setShowAdornment()
        },
        {
          undoStringKey: undoAddKey,
          redoStringKey: redoAddKey,
          log: logMessageWithReplacement("Show %@", {adornmentType: checkBoxType === "count" ? "count" : "percent"})
        }
      )
    } else {
      graphModel.applyModelChange(
        () => adornmentsStore.updateAdornment(setShowAdornment),
        {
          undoStringKey: undoRemoveKey,
          redoStringKey: redoRemoveKey,
          log: logMessageWithReplacement("Hide %@", {adornmentType: checkBoxType === "count" ? "count" : "percent"})
        }
      )
    }
  }

  const handlePercentTypeSetting = (percentType: PercentType) => {
    existingAdornment?.setPercentType(percentType)
    setPercentTypeValue(percentType)
  }

  return (
    <>
      <FormControl>
        <Checkbox
          data-testid={`adornment-checkbox-${kCountClass}-count`}
          defaultChecked={existingAdornment?.showCount}
          onChange={e => handleSetting(e.target.checked, "count")}
        >
          {t(kCountLabelKey)}
        </Checkbox>
      </FormControl>
      {shouldShowPercentOption &&
        <FormControl>
          <Checkbox
            data-testid={`adornment-checkbox-${kCountClass}-percent`}
            defaultChecked={existingAdornment?.showPercent}
            onChange={e => handleSetting(e.target.checked, "percent")}
          >
            {t(kPercentLabelKey)}
          </Checkbox>
          {shouldShowPercentTypeOptions &&
            <div
              className="sub-options percent-type"
              data-testid="adornment-percent-type-options"
            >
              <FormControl isDisabled={!enablePercentOptions}>
                <RadioGroup
                  name="percent-type"
                  size="md"
                  value={percentTypeValue}
                  onChange={handlePercentTypeSetting}
                >
                  <Radio value="row" size="md">
                    {t("DG.Inspector.graphRow")}
                  </Radio>
                  <Radio value="column" size="md">
                    {t("DG.Inspector.graphColumn")}
                  </Radio>
                  <Radio value="cell" size="md">
                    {t("DG.Inspector.graphCell")}
                  </Radio>
                </RadioGroup>
              </FormControl>
            </div>
          }
        </FormControl>
      }
    </>
  )
}

const v2PercentTypes: Record<string, number> = {
  cell: 0,
  row: 1,
  column: 2
}

registerAdornmentContentInfo({
  type: kCountType,
  plots: ["casePlot", "dotChart", "dotPlot", "scatterPlot"],
  prefix: kCountPrefix,
  modelClass: CountAdornmentModel,
  exporter: (model: IAdornmentModel, options: IAdornmentExporterOptions) => {
    const adornment = isCountAdornment(model) ? model : undefined
    // in v2 file format, showing movable values "turns off" the count adornment
    const isVisible = model.isVisible && !options.isShowingMovableValues
    return adornment
            ? {
                plottedCount: {
                  ...exportAdornmentBase(model, { ...options, isVisible }),
                  isShowingCount: adornment.showCount && !options.isShowingMovableValues,
                  isShowingPercent: adornment.showPercent && !options.isShowingMovableValues,
                  percentKind: v2PercentTypes[adornment.percentType]
                }
              }
            : undefined
  }
})

registerAdornmentComponentInfo({
  adornmentEltClass: kCountClass,
  Component: CountAdornment,
  Controls,
  labelKey: kCountLabelKey,
  order: 10,
  type: kCountType
})

registerAdornmentHandler(kCountType, countAdornmentHandler, "Percent")
