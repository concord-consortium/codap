import React from "react"
import { Button, Menu, MenuButton, MenuItem, MenuList } from "@chakra-ui/react"
import { registerAdornmentComponentInfo } from "../adornment-component-info"
import { getAdornmentContentInfo, registerAdornmentContentInfo } from "../adornment-content-info"
import { IMovableValueModel, MovableValueModel } from "./movable-value-model"
import { kMovableValueClass, kMovableValueLabelKey, kMovableValuePrefix,
         kMovableValueType } from "./movable-value-types"
import { MovableValue } from "./movable-value"
import { useGraphContentModelContext } from "../../hooks/use-graph-content-model-context"

const Controls = () => {
  const graphModel = useGraphContentModelContext()

  const handleAddMovableValue = () => {
    const existingAdornment = graphModel.adornments.find(a => a.type === kMovableValueType) as IMovableValueModel
    const componentContentInfo = getAdornmentContentInfo(kMovableValueType)
    const adornment = existingAdornment ?? componentContentInfo.modelClass.create() as IMovableValueModel
    graphModel.addAdornment(adornment)
  }

  const handleRemoveMovableValue = () => {
    const adornment = graphModel.adornments.find(a => a.type === kMovableValueType) as IMovableValueModel
    graphModel.updateAdornment(() => {
      adornment.deleteValue()
    })
    if (!adornment.hasValues) {
      adornment.setVisibility(false)
    }
  }

  return (
    <Menu>
      {({ isOpen }) => (
        <>
          <MenuButton isActive={isOpen} as={Button} size="xs" w="120px" data-testid="adornment-button-movable-value">
            Movable Value
          </MenuButton>
          <MenuList>
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
  modelClass: MovableValueModel
})

registerAdornmentComponentInfo({
  adornmentEltClass: kMovableValueClass,
  Component: MovableValue,
  Controls,
  labelKey: kMovableValueLabelKey,
  order: 100,
  type: kMovableValueType
})
