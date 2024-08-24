import { SlateExchangeValue, textToSlate } from "@concord-consortium/slate-editor"
import { SetRequired } from "type-fest"
import { V2Text } from "../../data-interactive/data-interactive-component-types"
import { registerComponentHandler } from "../../data-interactive/handlers/component-handler"
import { registerTileComponentInfo } from "../../models/tiles/tile-component-info"
import { ITileLikeModel, registerTileContentInfo } from "../../models/tiles/tile-content-info"
import { ITileModelSnapshotIn } from "../../models/tiles/tile-model"
import { toV3Id } from "../../utilities/codap-utils"
import { safeJsonParse } from "../../utilities/js-utils"
import { t } from "../../utilities/translation/translate"
import { registerV2TileImporter } from "../../v2/codap-v2-tile-importers"
import { isV2TextComponent } from "../../v2/codap-v2-types"
import { ComponentTitleBar } from "../component-title-bar"
import { kTextTileClass, kTextTileType, kV2TextType } from "./text-defs"
import { editorValueToModelValue, isTextModel, ITextSnapshot, modelValueToEditorValue, TextModel } from "./text-model"
import { TextTile } from "./text-tile"
import TextIcon from "../../assets/icons/icon-text.svg"

export const kTextIdPrefix = "TEXT"

registerTileContentInfo({
  type: kTextTileType,
  prefix: kTextIdPrefix,
  modelClass: TextModel,
  defaultContent: () => ({ type: kTextTileType }),
  getTitle: (tile: ITileLikeModel) => {
    return tile.title || t("DG.DocumentController.textTitle")
  }
})

registerTileComponentInfo({
  type: kTextTileType,
  TitleBar: ComponentTitleBar,
  Component: TextTile,
  tileEltClass: kTextTileClass,
  Icon: TextIcon,
  shelf: {
    position: 6,
    labelKey: "DG.ToolButtonData.textButton.title",
    hintKey: "DG.ToolButtonData.textButton.toolTip",
    undoStringKey: "DG.Undo.textComponent.create",
    redoStringKey: "DG.Redo.textComponent.create"
  },
  defaultWidth: 300,
  defaultHeight: 100
})

function importTextToModelValue(text?: string | SlateExchangeValue) {
  // According to a comment in the v2 code: "Prior to build 0535 this was simple text.
  // As of 0535 it is a JSON representation of the rich text content."
  // For v3, we make sure we're always dealing with rich-text JSON.
  if (typeof text === "string") {
    const json = safeJsonParse(text)
    return text != null && json != null && typeof json === "object"
            ? text
            : editorValueToModelValue(textToSlate(text))
  }
  return editorValueToModelValue(text?.document?.children ?? [])
}

registerV2TileImporter("DG.TextView", ({ v2Component, insertTile }) => {
  if (!isV2TextComponent(v2Component)) return

  const { guid, componentStorage: { title = "", text } } = v2Component

  const content: SetRequired<ITextSnapshot, "type"> = {
    type: kTextTileType,
    value: importTextToModelValue(text)
  }
  const textTileSnap: ITileModelSnapshotIn = { id: toV3Id(kTextIdPrefix, guid), _title: title, content }
  const textTile = insertTile(textTileSnap)

  return textTile
})

registerComponentHandler(kV2TextType, {
  create({ values }) {
    const { text } = values as V2Text
    return {
      content: {
        type: kTextTileType,
        value: importTextToModelValue(text)
      }
    }
  },
  get(content) {
    if (isTextModel(content)) {
      return {
        type: kV2TextType,
        text: content.value
      }
    }
  },
  update(content, values) {
    if (isTextModel(content)) {
      const { text } = values as V2Text
      if (typeof text === "string") {
        content.setValue(modelValueToEditorValue(importTextToModelValue(text)))
      } else if (text?.document?.children) {
        content.setValue(text.document.children)
      }
    }

    return { success: true }
  }
})
