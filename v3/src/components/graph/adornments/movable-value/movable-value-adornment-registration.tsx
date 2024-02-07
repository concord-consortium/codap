import React from "react"
import { Button, Flex } from "@chakra-ui/react"
import { registerAdornmentComponentInfo } from "../adornment-component-info"
import { getAdornmentContentInfo, registerAdornmentContentInfo } from "../adornment-content-info"
import { IMovableValueAdornmentModel, MovableValueAdornmentModel } from "./movable-value-adornment-model"
import { kMovableValueClass, kMovableValueLabelKey, kMovableValuePrefix, kMovableValueRedoAddKey,
         kMovableValueRedoRemoveKey, kMovableValueType, kMovableValueUndoAddKey,
         kMovableValueUndoRemoveKey} from "./movable-value-adornment-types"
import { MovableValueAdornment } from "./movable-value-adornment-component"
import { useGraphContentModelContext } from "../../hooks/use-graph-content-model-context"
import t from "../../../../utilities/translation/translate"

// Todo: The following import doesn't seem to have any effect on what is displayed in the UI
// import '../../components/inspector-panel/measure-panel.scss'

const Controls = () => {
  const graphModel = useGraphContentModelContext()
  const adornmentsStore = graphModel.adornmentsStore
  const buttonStyle = {
    fontSize: '12px', 'font-weight': 400, 'background-color': '#eeeeee', height: '24px', 'justify-content': 'left',
    width: 'fit-content'
  }

  const handleAddMovableValue = () => {
    const existingAdornment = adornmentsStore.findAdornmentOfType<IMovableValueAdornmentModel>(kMovableValueType)
    const componentContentInfo = getAdornmentContentInfo(kMovableValueType)
    const adornment = existingAdornment ?? componentContentInfo.modelClass.create() as IMovableValueAdornmentModel

    graphModel.applyUndoableAction(
      () => adornmentsStore.addAdornment(adornment, graphModel.getUpdateCategoriesOptions()),
      kMovableValueUndoAddKey, kMovableValueRedoAddKey
    )
  }

  const handleRemoveMovableValue = () => {
    const adornment = adornmentsStore.findAdornmentOfType<IMovableValueAdornmentModel>(kMovableValueType)

    graphModel.applyUndoableAction(
      () => {
          adornmentsStore.updateAdornment(() => { adornment?.deleteValue() })
          if (!adornment?.hasValues) adornment?.setVisibility(false)
      },
      kMovableValueUndoRemoveKey, kMovableValueRedoRemoveKey
    )
  }
  /**
   * Todo: The two buttons are problematic wrt style.
   * 1. The className is not being applied to the buttons.
   * 2. The font-weight defined in buttonStyle is not being applied to the buttons.
   * 3. There should be a space between the two buttons.
   * Note that moving this code to the GraphMeasureGroup component doesn't solve the problem.
   */
  return (
    <Flex direction="column">
      <Button onClick={handleAddMovableValue} data-testid="adornment-button-movable-value--add"
              className='measure-movable-value-button' variant='solid' size='sm'
              style={buttonStyle}
      >
        {t('DG.Inspector.graphAdd')}
      </Button>
      <Button onClick={handleRemoveMovableValue} data-testid="adornment-button-movable-value--remove"
              className='measure-movable-value-button' variant='solid' size='sm'
              style={buttonStyle}
      >
        {t('DG.Inspector.graphRemove')}
      </Button>
    </Flex>
  )
}

registerAdornmentContentInfo({
  type: kMovableValueType,
  plots: ['dotPlot'],
  prefix: kMovableValuePrefix,
  modelClass: MovableValueAdornmentModel
})

registerAdornmentComponentInfo({
  adornmentEltClass: kMovableValueClass,
  Component: MovableValueAdornment,
  Controls,
  labelKey: kMovableValueLabelKey,
  order: 100,
  type: kMovableValueType
})
