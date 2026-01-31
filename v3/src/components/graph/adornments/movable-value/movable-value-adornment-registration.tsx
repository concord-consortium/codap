import { Button, Flex } from "@chakra-ui/react"
import { registerAdornmentHandler } from "../../../../data-interactive/handlers/adornment-handler"
import { safeJsonParse } from "../../../../utilities/js-utils"
import { isFiniteNumber } from "../../../../utilities/math-utils"
import { t } from "../../../../utilities/translation/translate"
import { ICodapV2MovableValueAdornmentInstance } from "../../../../v2/codap-v2-types"
import { useGraphContentModelContext } from "../../hooks/use-graph-content-model-context"
import { registerAdornmentComponentInfo } from "../adornment-component-info"
import { exportAdornmentBase, getAdornmentContentInfo, registerAdornmentContentInfo } from "../adornment-content-info"
import { IUpdateCategoriesOptions } from "../adornment-models"
import { MovableValueAdornment } from "./movable-value-adornment-component"
import { movableValueAdornmentHandler } from "./movable-value-adornment-handler"
import {
  IMovableValueAdornmentModel, isMovableValueAdornment, MovableValueAdornmentModel
} from "./movable-value-adornment-model"
import {
  kMovableValueClass, kMovableValueLabelKey, kMovableValuePrefix, kMovableValueRedoAddKey,
  kMovableValueRedoRemoveKey, kMovableValueType, kMovableValueUndoAddKey, kMovableValueUndoRemoveKey
} from "./movable-value-adornment-types"

const Controls = () => {
  const graphModel = useGraphContentModelContext()
  const adornmentsStore = graphModel.adornmentsStore

  const handleAddMovableValue = () => {
    const existingAdornment = adornmentsStore.findAdornmentOfType<IMovableValueAdornmentModel>(kMovableValueType)
    const componentContentInfo = getAdornmentContentInfo(kMovableValueType)
    const adornment = existingAdornment ?? componentContentInfo.modelClass.create() as IMovableValueAdornmentModel
    const options: IUpdateCategoriesOptions = { ...graphModel.getUpdateCategoriesOptions(), addMovableValue: true }

    graphModel.applyModelChange(
      () => adornmentsStore.addAdornment(adornment, options),
      {
        undoStringKey: kMovableValueUndoAddKey,
        redoStringKey: kMovableValueRedoAddKey,
        log: `Added movable value`
      }
    )
  }

  const handleRemoveMovableValue = () => {
    const adornment = adornmentsStore.findAdornmentOfType<IMovableValueAdornmentModel>(kMovableValueType)

    graphModel.applyModelChange(
      () => {
          adornmentsStore.updateAdornment(() => { adornment?.deleteValue() })
          if (!adornment?.hasValues) adornment?.setVisibility(false)
      },
      {
        undoStringKey: kMovableValueUndoRemoveKey,
        redoStringKey: kMovableValueRedoRemoveKey,
        log: `Removed movable value`
      }
    )
  }

  return (
    <Flex direction="column">
      <Button onClick={handleAddMovableValue} data-testid="adornment-button-movable-value--add"
              className='measure-movable-value-button'/* variant='solid' size='sm'*/
      >
        {t('DG.Inspector.graphAdd')}
      </Button>
      <Button onClick={handleRemoveMovableValue} data-testid="adornment-button-movable-value--remove"
              className='measure-movable-value-button' variant='solid' size='sm'
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
  modelClass: MovableValueAdornmentModel,
  exporter: (model, options) => {
    const adornment = isMovableValueAdornment(model) ? model : undefined
    if (!adornment) return undefined
    const splitAttrId: Maybe<string> = options.categoricalAttrs[0]?.attrId
    const valueModels: ICodapV2MovableValueAdornmentInstance[] =
      !splitAttrId
        // with no split, write out array of values with key of `_main
        ? adornment.valuesForKey().map(value => ({
            isVisible: adornment.isVisible,
            enableMeasuresForSelection: options.showMeasuresForSelection,
            values: { _main: value }
          }))
        // when split, fill in the values separately
        : adornment.firstValueArray.map(() => ({
            isVisible: adornment.isVisible,
            enableMeasuresForSelection: options.showMeasuresForSelection,
            values: {}
          }))

    if (splitAttrId) {
      adornment.values.forEach((valuesArray, key) => {
        const parsedKey = safeJsonParse(`${key}`)
        // v2 only considers the first categorical attribute when saving/exporting
        if (typeof parsedKey === "object" && parsedKey[splitAttrId] != null) {
          const splitValue = parsedKey[splitAttrId]
          valuesArray.forEach((value, index) => {
            if (isFiniteNumber(value) && valueModels[index].values[splitValue] == null) {
              valueModels[index].values[splitValue] = value
            }
          })
        }
      })
    }

    return {
      multipleMovableValues: {
        ...exportAdornmentBase(model, options),
        isShowingCount: options.isShowingCount,
        isShowingPercent: options.isShowingPercent,
        valueModels
      }
    }
  }
})

registerAdornmentComponentInfo({
  adornmentEltClass: kMovableValueClass,
  Component: MovableValueAdornment,
  Controls,
  labelKey: kMovableValueLabelKey,
  order: 100,
  type: kMovableValueType
})

registerAdornmentHandler(kMovableValueType, movableValueAdornmentHandler)
