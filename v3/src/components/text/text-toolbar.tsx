import { IButtonSpec, SlateToolbar, ToolbarTransform } from "@concord-consortium/slate-editor"
import { observer } from "mobx-react-lite"
import React from "react"
import { useTileModelContext } from "../../hooks/use-tile-model-context"
import { useDocumentContainerContext } from "../../hooks/use-document-container-context"

const buttonOrder = [
  //column 1
  "bold",
  "italic",
  "underlined",
  "deleted",
  "code",
  "superscript",
  "subscript",
  "color",
  "image",

  //column 2
  "link",
  "heading1",
  "heading2",
  "heading3",
  "block-quote",
  "ordered-list",
  "bulleted-list"
  // "fontIncrease",
  // "fontDecrease",
]

export const transformToolbarButtons: ToolbarTransform = (buttons) => {
  // arrange the buttons
  const buttonMap = new Map<string, IButtonSpec>()
  buttons.forEach(buttonSpec => {
    if (buttonSpec.format) {
      buttonMap.set(buttonSpec.format, buttonSpec)
    }
  })
  return buttonOrder.map(format => buttonMap.get(format)).filter(button => !!button)
}

export const TextToolbar = observer(function TextToolbar() {
  const documentContainerRef = useDocumentContainerContext()
  const { isTileSelected } = useTileModelContext()

  return (
    <div className="codap-toolbar-wrapper">
      <SlateToolbar
        className={"codap-ccrte-toolbar"}
        modalPortalRoot={documentContainerRef.current ?? undefined}
        orientation="vertical"
        colors={{
          buttonColors: { fill: "#ffffff", background: "#177991" },
          selectedColors: { fill: "#177991", background: "#72bfca" }
        }}
        buttonsPerRow={9}
        transform={transformToolbarButtons}
        padding={2}
        show={isTileSelected()}
      />
    </div>
  )
})
