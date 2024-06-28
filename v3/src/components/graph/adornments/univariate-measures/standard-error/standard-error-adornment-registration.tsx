import React, { useCallback, useEffect } from "react"
import { Flex, NumberDecrementStepper, NumberIncrementStepper, NumberInput, NumberInputField, NumberInputStepper }
  from "@chakra-ui/react"
import { translate } from "../../../../../utilities/translation/translate"
import { AdornmentCheckbox } from "../../adornment-checkbox"
import { useGraphContentModelContext } from "../../../hooks/use-graph-content-model-context"
import { registerAdornmentComponentInfo } from "../../adornment-component-info"
import { registerAdornmentContentInfo } from "../../adornment-content-info"
import {
  kStandardErrorClass, kStandardErrorLabelKey, kStandardErrorType, kStandardErrorPrefix,
  kStandardErrorUndoAddKey, kStandardErrorRedoAddKey, kStandardErrorRedoRemoveKey,
  kStandardErrorUndoRemoveKey
} from "./standard-error-adornment-types"
import { IStandardErrorAdornmentModel, StandardErrorAdornmentModel } from "./standard-error-adornment-model"
import { StandardErrorAdornmentComponent } from "./standard-error-adornment-component"

const Controls = () => {
  const graphModel = useGraphContentModelContext()
  const adornmentsStore = graphModel.adornmentsStore
  const existingAdornment =
    adornmentsStore.findAdornmentOfType<IStandardErrorAdornmentModel>(kStandardErrorType)

  const handleBlur = useCallback(() => {
    if (existingAdornment) {
      graphModel.applyModelChange(
        () => {
          const numStErrs = existingAdornment.numStErrs  // Can be NaN if user cleared value
          if (isFinite(numStErrs)) {
            existingAdornment.setNumStErrs(numStErrs)
          }
          else {
            existingAdornment?.setDynamicNumStErrs(undefined)
          }
        },
        {
          undoStringKey: 'DG.Undo.graph.setNumStErrs',
          redoStringKey: 'DG.Undo.graph.setNumStErrs'
        }
      )
    }
  }, [existingAdornment, graphModel])

  useEffect(() => {
    // Return a cleanup function that will be called when the component is unmounted
    return () => {
      handleBlur()
    }
  }, [handleBlur])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleBlur()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      if (existingAdornment) {
        existingAdornment.setDynamicNumStErrs(undefined)
      }
    }
  }

  return (
    <Flex direction="row">
      <AdornmentCheckbox
        classNameValue={kStandardErrorClass}
        labelKey={''}
        type={kStandardErrorType}
      />
      <NumberInput min={0} size={"xs"} variant={"outline"}
                   data-testid={`adornment-number-input-${kStandardErrorClass}`}
                   focusInputOnChange={true}
                   focusBorderColor={"blue.500"}
                   isDisabled={!existingAdornment?.isVisible}
                   defaultValue={existingAdornment?.numStErrs ?? 1}
                   onFocus={(e) => e.target.select()}
                   onChange={(_, valueAsNumber) => {
                     existingAdornment?.setDynamicNumStErrs(valueAsNumber)
                   }}
                   onBlur={handleBlur}
                   onKeyDown={(e) => handleKeyDown(e)}
      >
        <NumberInputField/>
        <NumberInputStepper>
          <NumberIncrementStepper/>
          <NumberDecrementStepper/>
        </NumberInputStepper>
      </NumberInput>
      <span>{translate(kStandardErrorLabelKey)}</span>
    </Flex>
  )
}

registerAdornmentContentInfo({
  type: kStandardErrorType,
  parentType: "Univariate Measure",
  plots: ["dotPlot"],
  prefix: kStandardErrorPrefix,
  modelClass: StandardErrorAdornmentModel,
  undoRedoKeys: {
    undoAdd: kStandardErrorUndoAddKey,
    redoAdd: kStandardErrorRedoAddKey,
    undoRemove: kStandardErrorUndoRemoveKey,
    redoRemove: kStandardErrorRedoRemoveKey,
  }
})

registerAdornmentComponentInfo({
  adornmentEltClass: kStandardErrorClass,
  Component: StandardErrorAdornmentComponent,
  Controls,
  labelKey: kStandardErrorLabelKey,
  order: 10,
  type: kStandardErrorType
})
