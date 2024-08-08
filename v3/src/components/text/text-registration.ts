import { serializeValue, textToSlate } from "@concord-consortium/slate-editor"
import { SetRequired } from "type-fest"
import { ComponentTitleBar } from "../component-title-bar"
import { registerTileComponentInfo } from "../../models/tiles/tile-component-info"
import { ITileLikeModel, registerTileContentInfo } from "../../models/tiles/tile-content-info"
import { ITileModelSnapshotIn } from "../../models/tiles/tile-model"
import { toV3Id } from "../../utilities/codap-utils"
import { safeJsonParse } from "../../utilities/js-utils"
import { t } from "../../utilities/translation/translate"
import { registerV2TileImporter } from "../../v2/codap-v2-tile-importers"
import { isV2TextComponent } from "../../v2/codap-v2-types"
import { kTextTileClass, kTextTileType } from "./text-defs"
import { ITextSnapshot, TextModel } from "./text-model"
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

registerV2TileImporter("DG.TextView", ({ v2Component, insertTile }) => {
  if (!isV2TextComponent(v2Component)) return

  const { guid, componentStorage: { title = "", text } } = v2Component

  // According to a comment in the v2 code: "Prior to build 0535 this was simple text.
  // As of 0535 it is a JSON representation of the rich text content."
  // For v3, we make sure we're always dealing with rich-text JSON.
  const json = safeJsonParse(text)
  const value = json != null && typeof json === "object" ? text : JSON.stringify(serializeValue(textToSlate(text)))

  const content: SetRequired<ITextSnapshot, "type"> = {
    type: kTextTileType,
    value
  }
  const textTileSnap: ITileModelSnapshotIn = { id: toV3Id(kTextIdPrefix, guid), _title: title, content }
  const textTile = insertTile(textTileSnap)

  return textTile
})
