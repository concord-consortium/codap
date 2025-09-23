import {
  CustomEditor, EditorValue, serializeValue, SlateExchangeValue, slateToText, textToSlate
} from "@concord-consortium/slate-editor"
import { cloneDeep, isEqual } from "lodash"
import { Instance, SnapshotIn, types } from "mobx-state-tree"
import { ITileContentModel, TileContentModel } from "../../models/tiles/tile-content"
import { safeJsonParse } from "../../utilities/js-utils"
import { kTextTileType } from "./text-defs"

export function editorValueToModelValue(value: EditorValue) {
  return cloneDeep(serializeValue(value))
}

export function modelValueToEditorValue(value?: SlateExchangeValue) {
  return cloneDeep(value?.document?.children) ?? textToSlate("")
}

export const TextModel = TileContentModel
  .named("TextModel")
  .props({
    type: types.optional(types.literal(kTextTileType), kTextTileType),
    value: types.optional(types.frozen<SlateExchangeValue>(), () => editorValueToModelValue(textToSlate("")))
  })
  .volatile(self => ({
    editor: undefined as Maybe<CustomEditor>,
    editorChangeCount: 0,
    isSettingValue: false
  }))
  .preProcessSnapshot(snap => {
    if (typeof snap.value === "string") {
      const { value, ...others } = snap
      return { value: safeJsonParse<SlateExchangeValue>(value), ...others }
    }
    return snap
  })
  .postProcessSnapshot(({ value, ...others }) => {
    return { value: JSON.stringify(value), ...others }
  })
  .views(self => ({
    isEquivalent(value: EditorValue) {
      return isEqual(self.value, editorValueToModelValue(value))
    },
    get textContent() {
      return slateToText(self.value?.document?.children)
    }
  }))
  .actions(self => ({
    incEditorChange() {
      ++self.editorChangeCount
    },
    setEditor(editor: CustomEditor) {
      self.editor = editor
    },
    setValue(value: EditorValue) {
      self.value = editorValueToModelValue(value)
    }
  }))
  .actions(self => ({
    setValueFromEditor(value: EditorValue) {
      // The component will not update when isSettingValue is true
      self.isSettingValue = true
      self.setValue(value)
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
