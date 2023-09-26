import React from "react"
import { FormControl, Checkbox } from "@chakra-ui/react"
import t from "../../../utilities/translation/translate"
import { useGraphContentModelContext } from "../hooks/use-graph-content-model-context"
import { getAdornmentContentInfo } from "./adornment-content-info"
import { isUnivariateMeasureAdornment } from "./univariate-measures/univariate-measure-adornment-model"

interface IProps {
  classNameValue: string
  labelKey: string
  type: string
}

export const AdornmentCheckbox = ({classNameValue, labelKey, type}: IProps) => {
  const graphModel = useGraphContentModelContext()
  const adornmentsStore = graphModel?.adornmentsStore
  const existingAdornment = adornmentsStore.adornments.find(a => a.type === type)

  const handleSetting = (checked: boolean) => {
    const componentContentInfo = getAdornmentContentInfo(type)
    const adornment = existingAdornment ?? componentContentInfo.modelClass.create()
    adornment.updateCategories(graphModel.getUpdateCategoriesOptions())
    adornment.setVisibility(checked)
    if (checked) {
      adornmentsStore.showAdornment(adornment, adornment.type)
      isUnivariateMeasureAdornment(adornment) && adornmentsStore?.addActiveUnivariateMeasure(adornment.type)
    } else {
      adornmentsStore.hideAdornment(adornment.type)
      isUnivariateMeasureAdornment(adornment) && adornmentsStore?.removeActiveUnivariateMeasure(adornment.type)
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
