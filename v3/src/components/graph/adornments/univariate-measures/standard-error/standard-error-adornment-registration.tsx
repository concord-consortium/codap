import React, { useCallback, useEffect } from "react"
import { Button, Group, Input, NumberField } from "react-aria-components"
import { registerAdornmentHandler } from "../../../../../data-interactive/handlers/adornment-handler"
import { logMessageWithReplacement } from "../../../../../lib/log-message"
import { translate } from "../../../../../utilities/translation/translate"
import { useGraphContentModelContext } from "../../../hooks/use-graph-content-model-context"
import { registerAdornmentComponentInfo } from "../../adornment-component-info"
import { registerAdornmentContentInfo } from "../../adornment-content-info"
import { AdornmentCheckbox } from "../../components/adornment-checkbox"
import { exportUnivariateMeasure } from "../univariate-measure-adornment-utils"
import { StandardErrorAdornmentComponent } from "./standard-error-adornment-component"
import { standardErrorAdornmentHandler } from "./standard-error-adornment-handler"
import {
  isStandardErrorAdornment, IStandardErrorAdornmentModel, StandardErrorAdornmentModel
} from "./standard-error-adornment-model"
import {
  kStandardErrorClass, kStandardErrorLabelKey, kStandardErrorType, kStandardErrorPrefix,
  kStandardErrorUndoAddKey, kStandardErrorRedoAddKey, kStandardErrorRedoRemoveKey,
  kStandardErrorUndoRemoveKey
} from "./standard-error-adornment-types"

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
          redoStringKey: 'DG.Undo.graph.setNumStErrs',
          log: logMessageWithReplacement("Set standard error to %@", {numStErrs: existingAdornment.numStErrs})
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
    <div className="standard-error-controls">
      <AdornmentCheckbox
        classNameValue={kStandardErrorClass}
        labelKey={''}
        type={kStandardErrorType}
      />
      <NumberField
        className="standard-error-number-field"
        data-testid={`adornment-number-input-${kStandardErrorClass}`}
        minValue={0}
        step={0.5}
        defaultValue={existingAdornment?.numStErrs ?? 1}
        isDisabled={!existingAdornment?.isVisible}
        onChange={(value) => existingAdornment?.setDynamicNumStErrs(value)}
      >
        <Group className="standard-error-input-group">
          <Input
            className="standard-error-input"
            onFocus={(e) => e.target.select()}
            onBlur={handleBlur}
            onKeyDown={(e) => handleKeyDown(e)}
          />
          <Button slot="decrement" className="standard-error-stepper"
              data-testid="standard-error-stepper-decrement">
            −
          </Button>
          <Button slot="increment" className="standard-error-stepper"
              data-testid="standard-error-stepper-increment">
            +
          </Button>
        </Group>
      </NumberField>
      <span className="standard-error-label">{translate(kStandardErrorLabelKey)}</span>
    </div>
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
  },
  exporter: (model, options) => {
    const adornment = isStandardErrorAdornment(model) ? model : undefined
    return adornment
            ? {
                plottedStErr: {
                  ...exportUnivariateMeasure(adornment, options),
                  numberOfStdErrs: adornment.numStErrs
                }
              }
            : undefined
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

registerAdornmentHandler(kStandardErrorType, standardErrorAdornmentHandler)
