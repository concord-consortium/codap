import React from "react"
import { Button, Menu, MenuButton, MenuItem, MenuList } from "@chakra-ui/react"
import { registerAdornmentComponentInfo } from "../adornment-component-info"
import { getAdornmentContentInfo, registerAdornmentContentInfo } from "../adornment-content-info"
import { IMovableValueAdornmentModel, MovableValueAdornmentModel } from "./movable-value-adornment-model"
import { kMovableValueClass, kMovableValueLabelKey, kMovableValuePrefix, kMovableValueRedoAddKey,
         kMovableValueRedoRemoveKey, kMovableValueType, kMovableValueUndoAddKey,
         kMovableValueUndoRemoveKey} from "./movable-value-adornment-types"
import { MovableValueAdornment } from "./movable-value-adornment-component"
import { useGraphContentModelContext } from "../../hooks/use-graph-content-model-context"

const Controls = () => {
  const graphModel = useGraphContentModelContext()
  const adornmentsStore = graphModel.adornmentsStore

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

  return (
    <Menu>
      {({ isOpen }) => (
        <>
          <MenuButton isActive={isOpen} as={Button} size="xs" w="120px" data-testid="adornment-button-movable-value">
            Movable Value
          </MenuButton>
          <MenuList data-testid="adornment-button-movable-value-list">
            <MenuItem onClick={handleAddMovableValue} data-testid="adornment-button-movable-value--add">
              Add
            </MenuItem>
            <MenuItem onClick={handleRemoveMovableValue} data-testid="adornment-button-movable-value--remove">
              Remove
            </MenuItem>
          </MenuList>
        </>
      )}
    </Menu>
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
