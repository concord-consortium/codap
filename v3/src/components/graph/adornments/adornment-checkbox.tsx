import React from "react"
import { FormControl, Checkbox } from "@chakra-ui/react"
import t from "../../../utilities/translation/translate"
import { useGraphContentModelContext } from "../hooks/use-graph-content-model-context"
import { getAdornmentContentInfo } from "./adornment-content-info"

interface IProps {
  classNameValue: string
  labelKey: string
  type: string
}

export const AdornmentCheckbox = ({classNameValue, labelKey, type}: IProps) => {
  const graphModel = useGraphContentModelContext()
  const existingAdornment = graphModel.adornments.find(a => a.type === type)

  const handleSetting = (checked: boolean) => {
    const componentContentInfo = getAdornmentContentInfo(type)
    const adornment = existingAdornment ?? componentContentInfo.modelClass.create()
    adornment.updateCategories(graphModel.getUpdateCategoriesOptions())
    adornment.setVisibility(checked)
    if (checked) {
      graphModel.showAdornment(adornment, adornment.type)
    } else {
      graphModel.hideAdornment(adornment.type)
    }
  }

  return (
    <FormControl>
      <Checkbox
        data-testid={`adornment-checkbox-${classNameValue}`}
        defaultChecked={existingAdornment?.isVisible}
        onChange={e => handleSetting(e.target.checked)}
      >
        {t(labelKey)}
      </Checkbox>
    </FormControl>
  )
}
