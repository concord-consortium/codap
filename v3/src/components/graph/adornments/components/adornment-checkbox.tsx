import { FormControl, Checkbox } from "@chakra-ui/react"
import { observer } from "mobx-react-lite"
import { logMessageWithReplacement } from "../../../../lib/log-message"
import { t } from "../../../../utilities/translation/translate"
import { useGraphContentModelContext } from "../../hooks/use-graph-content-model-context"
import { getAdornmentContentInfo } from "../adornment-content-info"

interface IProps {
  classNameValue: string
  labelKey: string
  type: string
}

export const AdornmentCheckbox = observer(function AdornmentCheckbox({classNameValue, labelKey, type}: IProps) {
  const graphModel = useGraphContentModelContext()
  const adornmentsStore = graphModel?.adornmentsStore
  const existingAdornment = adornmentsStore.adornments.find(a => a.type === type)

  const handleSetting = (checked: boolean) => {
    const componentContentInfo = getAdornmentContentInfo(type)
    const adornment = existingAdornment ?? componentContentInfo.modelClass.create()
    const defaultUndoRedoKeys = {
      undoAdd: "DG.mainPage.mainPane.undoButton.toolTip",
      redoAdd: "DG.mainPage.mainPane.redoButton.toolTip",
      undoRemove: "DG.mainPage.mainPane.undoButton.toolTip",
      redoRemove: "DG.mainPage.mainPane.redoButton.toolTip"
    }
    const undoRedoKeys = componentContentInfo.undoRedoKeys ?? defaultUndoRedoKeys

    if (checked) {
      graphModel.applyModelChange(
        () => adornmentsStore.addAdornment(adornment, graphModel.getUpdateCategoriesOptions()),
        {
          undoStringKey: undoRedoKeys.undoAdd,
          redoStringKey: undoRedoKeys.redoAdd,
          log: logMessageWithReplacement(`Added %@`, {type: adornment.type})
        }
      )
    } else {
      graphModel.applyModelChange(
        () => adornmentsStore.hideAdornment(adornment.type),
        {
          undoStringKey: undoRedoKeys.undoRemove,
          redoStringKey: undoRedoKeys.redoRemove,
          log: logMessageWithReplacement(`Removed %@`, {type: adornment.type})
        }
      )
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
})
