import { Descendant, EFormat, SlateExchangeValue, textToSlate } from "@concord-consortium/slate-editor"
import { cloneDeep } from "lodash"
import { SetRequired } from "type-fest"
import TextIcon from "../../assets/icons/icon-text.svg"
import { V2Text } from "../../data-interactive/data-interactive-component-types"
import { registerComponentHandler } from "../../data-interactive/handlers/component-handler"
import { registerTileComponentInfo } from "../../models/tiles/tile-component-info"
import { ITileLikeModel, registerTileContentInfo } from "../../models/tiles/tile-content-info"
import { ITileModelSnapshotIn } from "../../models/tiles/tile-model"
import { toV3Id } from "../../utilities/codap-utils"
import { safeJsonParse } from "../../utilities/js-utils"
import { t } from "../../utilities/translation/translate"
import { registerV2TileExporter } from "../../v2/codap-v2-tile-exporters"
import { registerV2TileImporter } from "../../v2/codap-v2-tile-importers"
import { isV2TextComponent, V2SlateExchangeValue, V2TextObjTypesMap } from "../../v2/codap-v2-types"
import { ComponentTitleBar } from "../component-title-bar"
import { kTextTileClass, kTextTileType, kV2TextDGType, kV2TextDIType } from "./text-defs"
import { TextInspector } from "./text-inspector"
import { editorValueToModelValue, isTextModel, ITextSnapshot, modelValueToEditorValue, TextModel } from "./text-model"
import { TextTile } from "./text-tile"

export const kTextIdPrefix = "TEXT"

registerTileContentInfo({
  type: kTextTileType,
  prefix: kTextIdPrefix,
  modelClass: TextModel,
  defaultContent: () => ({ type: kTextTileType }),
  defaultName: () => t("DG.DocumentController.textTitle"),
  getTitle: (tile: ITileLikeModel) => {
    return tile.title || t("DG.DocumentController.textTitle")
  }
})

registerTileComponentInfo({
  type: kTextTileType,
  TitleBar: ComponentTitleBar,
  Component: TextTile,
  InspectorPanel: TextInspector,
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

function importTextToModelValue(text?: string | SlateExchangeValue): Maybe<SlateExchangeValue> {
  // According to a comment in the v2 code: "Prior to build 0535 this was simple text.
  // As of 0535 it is a JSON representation of the rich text content."
  // For v3, we make sure we're always dealing with rich-text JSON.
  if (typeof text === "string") {
    const value = safeJsonParse<SlateExchangeValue>(text)
    return text != null && value != null && typeof value === "object"
            ? value
            : editorValueToModelValue(textToSlate(text))
  }
  return editorValueToModelValue(text?.document?.children ?? [])
}

const kObjTypes: V2TextObjTypesMap = {
  // blocks
  [EFormat.block]: "block",
  [EFormat.blockQuote]: "block",
  [EFormat.heading1]: "block",
  [EFormat.heading2]: "block",
  [EFormat.heading3]: "block",
  [EFormat.heading4]: "block",
  [EFormat.heading5]: "block",
  [EFormat.heading6]: "block",
  [EFormat.horizontalRule]: "block",
  [EFormat.paragraph]: "block",
  [EFormat.preformatted]: "block",
  [EFormat.listItem]: "block",
  [EFormat.numberedList]: "block",
  [EFormat.bulletedList]: "block",
  // inlines
  [EFormat.inline]: "inline",
  [EFormat.image]: "inline",
  [EFormat.link]: "inline"
}

function addObjTypes(node: Descendant, objTypes: V2TextObjTypesMap) {
  if (typeof node === "object") {
    if ("type" in node && typeof node.type === "string" && !objTypes[node.type]) {
      objTypes[node.type] = kObjTypes[node.type] ?? "block"
    }
    if ("children" in node && Array.isArray(node.children)) {
      node.children.forEach(child => addObjTypes(child, objTypes))
    }
  }
}

registerV2TileExporter(kTextTileType, ({ tile }) => {
  const { content } = tile
  if (!isTextModel(content)) return
  const value = cloneDeep(content.value) as V2SlateExchangeValue
  const objTypes: Record<string, "block" | "inline"> = {}
  if (value.document) {
    value.document.children.forEach(node => addObjTypes(node, objTypes))
    value.document.objTypes = objTypes
  }
  return {
    type: kV2TextDGType,
    componentStorage: {
      text: JSON.stringify(value)
    }
  }
})

registerV2TileImporter(kV2TextDGType, ({ v2Component, insertTile }) => {
  if (!isV2TextComponent(v2Component)) return

  const { guid, componentStorage: { name = "", title, userSetTitle, text, cannotClose } } = v2Component

  const content: SetRequired<ITextSnapshot, "type"> = {
    type: kTextTileType,
    value: importTextToModelValue(text)
  }
  const textTileSnap: ITileModelSnapshotIn =
          { id: toV3Id(kTextIdPrefix, guid), _title: title, name, userSetTitle, content, cannotClose }
  const textTile = insertTile(textTileSnap)

  return textTile
})

registerComponentHandler(kV2TextDIType, {
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
        type: kV2TextDIType,
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
