import React, { useState } from "react"
import { FormControl, Checkbox, RadioGroup, Radio } from "@chakra-ui/react"
import { registerAdornmentComponentInfo } from "../adornment-component-info"
import { getAdornmentContentInfo, registerAdornmentContentInfo } from "../adornment-content-info"
import { CountAdornmentModel, ICountAdornmentModel, isCountAdornment } from "./count-adornment-model"
import { kCountClass, kCountLabelKey, kCountPrefix, kCountType, kPercentLabelKey } from "./count-adornment-types"
import { CountAdornment } from "./count-adornment-component"
import { t } from "../../../../utilities/translation/translate"
import { useGraphContentModelContext } from "../../hooks/use-graph-content-model-context"
import { useGraphDataConfigurationContext } from "../../hooks/use-graph-data-configuration-context"

const Controls = () => {
  const graphModel = useGraphContentModelContext()
  const dataConfig = useGraphDataConfigurationContext()
  const adornmentsStore = graphModel.adornmentsStore
  const existingAdornment = adornmentsStore.findAdornmentOfType<ICountAdornmentModel>(kCountType)
  const shouldShowPercentOption = dataConfig?.categoricalAttrCount || adornmentsStore.subPlotsHaveRegions ||
                                  graphModel.pointDisplayType === "bins"
  const categoricalAttrCount = dataConfig?.categoricalAttrCount ?? 0
  const shouldShowPercentTypeOptions = categoricalAttrCount > 1
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
      graphModel.applyUndoableAction(
        () => {
          adornmentsStore.addAdornment(adornment, graphModel.getUpdateCategoriesOptions())
          setShowAdornment()
        },
        {
          undoStringKey: undoAddKey,
          redoStringKey: redoAddKey
        }
      )
    } else {
      graphModel.applyUndoableAction(
        () => adornmentsStore.updateAdornment(setShowAdornment),
        {
          undoStringKey: undoRemoveKey,
          redoStringKey: redoRemoveKey
        }
      )
    }
  }

  const handlePercentTypeSetting = (percentType: string) => {
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

registerAdornmentContentInfo({
  type: kCountType,
  plots: ["casePlot", "dotChart", "dotPlot", "scatterPlot"],
  prefix: kCountPrefix,
  modelClass: CountAdornmentModel
})

registerAdornmentComponentInfo({
  adornmentEltClass: kCountClass,
  Component: CountAdornment,
  Controls,
  labelKey: kCountLabelKey,
  order: 10,
  type: kCountType
})
