import React, { useState } from "react"
import { FormControl, Checkbox, RadioGroup, Radio } from "@chakra-ui/react"
import { registerAdornmentComponentInfo } from "../adornment-component-info"
import { getAdornmentContentInfo, registerAdornmentContentInfo } from "../adornment-content-info"
import { CountModel, ICountModel, isCount } from "./count-model"
import { kCountClass, kCountLabelKey, kCountPrefix, kCountType, kPercentLabelKey } from "./count-types"
import { Count } from "./count"
import t from "../../../../utilities/translation/translate"
import { useGraphContentModelContext } from "../../hooks/use-graph-content-model-context"
import { useDataConfigurationContext } from "../../hooks/use-data-configuration-context"
import { shouldShowPercentOption, shouldShowPercentTypeOptions } from "../../utilities/adornment-utils"

const Controls = () => {
  const graphModel = useGraphContentModelContext()
  const dataConfig = useDataConfigurationContext()
  const existingAdornment = graphModel.adornments.find(a => a.type === kCountType) as ICountModel
  const attrTypes = {
    bottom: dataConfig?.attributeType("x"),
    left: dataConfig?.attributeType("y"),
    top: dataConfig?.attributeType("topSplit"),
    right: dataConfig?.attributeType("rightSplit")
  }
  const [enablePercentOptions, setEnablePercentOptions] = useState(existingAdornment?.showPercent)
  const [percentTypeValue, setPercentTypeValue] = useState(
    existingAdornment && isCount(existingAdornment) ? existingAdornment.percentType : "row"
  )

  const handleSetting = (checked: boolean, checkBoxType: string) => {
    const existingCountAdornment = graphModel.adornments.find(a => a.type === kCountType) as ICountModel
    const componentContentInfo = getAdornmentContentInfo(kCountType)
    const adornment = existingCountAdornment
      ? existingCountAdornment
      : componentContentInfo.modelClass.create() as ICountModel

    graphModel.hideAdornment(adornment.type)
    if (!existingCountAdornment) {
      adornment.updateCategories(graphModel.getUpdateCategoriesOptions())
    }
    if (checkBoxType === "count") {
      adornment.setShowCount(checked)
    }
    if (checkBoxType === "percent") {
      adornment.setShowPercent(checked)
      setEnablePercentOptions(checked)
    }
    if (checked) {
      graphModel.showAdornment(adornment, adornment.type)
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
      {shouldShowPercentOption(attrTypes) &&
        <FormControl>
          <Checkbox
            data-testid={`adornment-checkbox-${kCountClass}-percent`}
            defaultChecked={existingAdornment?.showPercent}
            onChange={e => handleSetting(e.target.checked, "percent")}
          >
            {t(kPercentLabelKey)}
          </Checkbox>
          {shouldShowPercentTypeOptions(attrTypes) &&
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
  modelClass: CountModel
})

registerAdornmentComponentInfo({
  adornmentEltClass: kCountClass,
  Component: Count,
  Controls,
  labelKey: kCountLabelKey,
  order: 10,
  type: kCountType
})
