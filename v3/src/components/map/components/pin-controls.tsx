import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import React from "react"
import { removeCasesWithCustomUndoRedo } from "../../../models/data/data-set-undo"
import AddIcon from "../assets/add-location-marker-icon.svg"
import RemoveIcon from "../assets/remove-location-marker-icon.svg"
import { kPinColors } from "../map-types"
import { IMapPinLayerModel } from "../models/map-pin-layer-model"
import "./pin-controls.scss"

interface IControlButtonProps {
  active?: boolean
  className?: string
  disabled?: boolean
  Icon?: any
  onClick?: React.MouseEventHandler<HTMLButtonElement>
  testId?: string
}
function ControlButton({ active, className, disabled, Icon, onClick, testId }: IControlButtonProps) {
  return (
    <button
      className={clsx("map-control-button", className, { active, disabled })}
      data-testid={testId}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {Icon && <Icon className="map-control-button-icon" />}
    </button>
  )
}

interface IPinControlsProps {
  mapLayerModel: IMapPinLayerModel
}
export const PinControls = observer(function PinControls({ mapLayerModel }: IPinControlsProps) {
  const dataset = mapLayerModel.dataConfiguration.dataset

  const addButtonDisabled = (dataset?.items.length ?? 0) >= kPinColors.length || !!dataset?.selection.size
  const removeButtonDisabled = !dataset?.selection.size

  const handleAddButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    mapLayerModel.setAddMode(!mapLayerModel.addMode)
  }
  const handleRemoveButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (dataset) {
      removeCasesWithCustomUndoRedo(dataset, Array.from(dataset.selection))
    }
  }
  return (
    <div className="pin-controls">
      <ControlButton
        active={mapLayerModel.addMode}
        className="top-button"
        disabled={addButtonDisabled}
        Icon={AddIcon}
        onClick={handleAddButtonClick}
        testId="add-pin-button"
      />
      <ControlButton
        className="bottom-button"
        disabled={removeButtonDisabled}
        Icon={RemoveIcon}
        onClick={handleRemoveButtonClick}
        testId="remove-pin-button"
      />
    </div>
  )
})
