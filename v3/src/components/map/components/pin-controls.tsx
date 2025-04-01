import clsx from "clsx"
import { observer } from "mobx-react-lite"
import React from "react"
import AddIcon from "../assets/add-location-marker-icon.svg"
import RemoveIcon from "../assets/remove-location-marker-icon.svg"
import { isMapPinLayerModel } from "../models/map-pin-layer-model"
import { useMapModelContext } from "../hooks/use-map-model-context"
import "./pin-controls.scss"

interface IControlButtonProps {
  className?: string
  disabled?: boolean
  Icon?: any
  onClick?: () => void
}
function ControlButton({ className, disabled, Icon, onClick }: IControlButtonProps) {
  return (
    <button
      className={clsx("map-control-button", className, { disabled })}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {Icon && <Icon className="map-control-button-icon" />}
    </button>
  )
}

export const PinControls = observer(function PinControls() {
  const mapModel = useMapModelContext()
  const pinLayer = mapModel?.layers.find((layer) => isMapPinLayerModel(layer))
  const dataset = pinLayer?.dataConfiguration?.dataset
  console.log(`--- dataset`, dataset)
  const selectionSize = dataset?.selection?.size ?? 0

  const addButtonDisabled = selectionSize >= 10
  const removeButtonDisabled = !selectionSize

  const handleRemoveButtonClick = () => {
    dataset?.removeCases(Array.from(dataset?.selection))
  }
  return (
    <div className="pin-controls">
      <ControlButton className="top-button" disabled={addButtonDisabled} Icon={AddIcon} />
      <ControlButton
        className="bottom-button"
        disabled={removeButtonDisabled}
        Icon={RemoveIcon}
        onClick={handleRemoveButtonClick}
      />
    </div>
  )
})
