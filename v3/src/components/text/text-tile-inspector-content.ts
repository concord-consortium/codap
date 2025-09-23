import { ImageElement, LinkElement } from "@concord-consortium/slate-editor"
import React from "react"
import { TileInspectorContent } from "../../hooks/use-tile-inspector-context"

export class TextTileInspectorContent extends TileInspectorContent {
  constructor(
    public isImageDialogOpen: boolean,
    public openImageDialog: () => void,
    public closeImageDialog: () => void,
    public editImage: React.MutableRefObject<Maybe<ImageElement>>,
    public isLinkDialogOpen: boolean,
    public openLinkDialog: () => void,
    public closeLinkDialog: () => void,
    public editLink: React.MutableRefObject<Maybe<LinkElement>>
  ) {
    super()
  }
}
