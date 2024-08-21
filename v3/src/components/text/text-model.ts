import {
  EditorValue, serializeValue, SlateExchangeValue, slateToText, textToSlate
} from "@concord-consortium/slate-editor"
import { Instance, SnapshotIn, types } from "mobx-state-tree"
import { ITileContentModel, TileContentModel } from "../../models/tiles/tile-content"
import { safeJsonParse } from "../../utilities/js-utils"
import { kTextTileType } from "./text-defs"

export function editorValueToModelValue(value: EditorValue) {
  return JSON.stringify(serializeValue(value))
}

export function modelValueToEditorValue(value?: string) {
  const parsedValue = safeJsonParse<SlateExchangeValue>(value)
  return parsedValue?.document?.children ?? textToSlate("")
}

export const TextModel = TileContentModel
  .named("TextModel")
  .props({
    type: types.optional(types.literal(kTextTileType), kTextTileType),
    value: types.optional(types.string, () => editorValueToModelValue(textToSlate("")))
  })
  .volatile(self => ({
    isSettingValue: false
  }))
  .views(self => ({
    isEquivalent(value: EditorValue) {
      return self.value === editorValueToModelValue(value)
    },
    get textContent() {
      const slate = safeJsonParse<SlateExchangeValue>(self.value)
      return slateToText(slate?.document?.children)
    }
  }))
  .actions(self => ({
    setValue(value: EditorValue) {
      console.log(`... value`, value)
      self.isSettingValue = true
      self.value = editorValueToModelValue(value)
      self.isSettingValue = false
    }
  }))
  .actions(self => ({
    setTextContent(text: string) {
      self.setValue(textToSlate(text))
    }
  }))
export interface ITextModel extends Instance<typeof TextModel> {}
export interface ITextSnapshot extends SnapshotIn<typeof TextModel> {}

export function isTextModel(model?: ITileContentModel): model is ITextModel {
  return model?.type === kTextTileType
}
