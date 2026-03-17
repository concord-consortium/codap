import {
  EFormat, getPlatformTooltip, isBlockActive, isMarkActive, toggleBlock, toggleMark, toggleSuperSubscript
} from "@concord-consortium/slate-editor"
import { observer } from "mobx-react-lite"
import React from "react"
import FormatBoldIcon from "../../assets/icons/inspector-panel/format-bold-icon.svg"
import FormatCodeIcon from "../../assets/icons/inspector-panel/format-code-icon.svg"
import FormatHeading1Icon from "../../assets/icons/inspector-panel/format-h-1-icon.svg"
import FormatHeading2Icon from "../../assets/icons/inspector-panel/format-h-2-icon.svg"
import FormatHeading3Icon from "../../assets/icons/inspector-panel/format-h-3-icon.svg"
import FormatItalicIcon from "../../assets/icons/inspector-panel/format-italic-icon.svg"
import FormatListBulletedIcon from "../../assets/icons/inspector-panel/format-list-bulleted-icon.svg"
import FormatListNumberedIcon from "../../assets/icons/inspector-panel/format-list-numbered-icon.svg"
import FormatQuoteIcon from "../../assets/icons/inspector-panel/format-quote-icon.svg"
import FormatStrikeThroughIcon from "../../assets/icons/inspector-panel/format-strikethrough-icon.svg"
import FormatSubscriptIcon from "../../assets/icons/inspector-panel/format-subscript-icon.svg"
import FormatSuperscriptIcon from "../../assets/icons/inspector-panel/format-superscript-icon.svg"
import FormatTextDecreaseIcon from "../../assets/icons/inspector-panel/format-text-decrease-icon.svg"
import FormatTextIncreaseIcon from "../../assets/icons/inspector-panel/format-text-increase-icon.svg"
import FormatUnderlineIcon from "../../assets/icons/inspector-panel/format-underline-icon.svg"
import { t } from "../../utilities/translation/translate"
import { InspectorButton, InspectorPanel } from "../inspector-panel"
import { ITileInspectorPanelProps } from "../tiles/tile-base-props"
import { FormatImageButton } from "./format-image-button"
import { FormatLinkButton } from "./format-link-button"
import { FormatTextColorButton } from "./format-text-color-button"
import { isTextModel } from "./text-model"

import "./text-inspector.scss"

export const TextInspector = observer(function TextInspector({ tile, show }: ITileInspectorPanelProps) {
  const textModel = isTextModel(tile?.content) ? tile.content : undefined

  // Trigger a re-render when the editor content changes
  textModel?.editorChangeCount  // eslint-disable-line @typescript-eslint/no-unused-expressions

  // Prevent focus theft from Slate editor when toolbar buttons are clicked
  const preventFocusLoss = (e: React.PointerEvent) => {
    e.preventDefault()
  }

  const isEditorMarkActive = (format: EFormat) => {
    return textModel?.editor ? isMarkActive(textModel.editor, format) : false
  }

  const handleMarkToggle = (format: EFormat) => {
    if (textModel?.editor) {
      toggleMark(textModel.editor, format)
    }
  }

  const isEditorBlockActive = (format: EFormat) => {
    return textModel?.editor ? isBlockActive(textModel.editor, format) : false
  }

  const handleBlockToggle = (format: EFormat) => {
    if (textModel?.editor) {
      toggleBlock(textModel.editor, format)
    }
  }

  const handleSuperSubscriptToggle = (format: EFormat.subscript | EFormat.superscript) => {
    if (textModel?.editor) {
      toggleSuperSubscript(textModel.editor, format)
    }
  }

  return (
    <InspectorPanel
      component="text"
      show={show}
      toolbarAriaLabel={t("DG.DocumentController.textTitle")}
      toolbarOrientation="vertical"
      toolbarPersistenceKey="text-inspector-toolbar"
      width="normal"
    >
      <InspectorButton
        testId={"text-toolbar-bold-button"}
        tooltip={getPlatformTooltip("bold (mod-b)")}
        isActive={isEditorMarkActive(EFormat.bold)}
        onButtonClick={() => handleMarkToggle(EFormat.bold)}
        onPointerDown={preventFocusLoss}
      >
        <FormatBoldIcon />
      </InspectorButton>
      <InspectorButton
        testId={"text-toolbar-italic-button"}
        tooltip={getPlatformTooltip("italic (mod-i)")}
        isActive={isEditorMarkActive(EFormat.italic)}
        onButtonClick={() => handleMarkToggle(EFormat.italic)}
        onPointerDown={preventFocusLoss}
      >
        <FormatItalicIcon />
      </InspectorButton>
      <InspectorButton
        testId={"text-toolbar-underline-button"}
        tooltip={getPlatformTooltip("underline (mod-u)")}
        isActive={isEditorMarkActive(EFormat.underlined)}
        onButtonClick={() => handleMarkToggle(EFormat.underlined)}
        onPointerDown={preventFocusLoss}
      >
        <FormatUnderlineIcon />
      </InspectorButton>
      <InspectorButton
        testId={"text-toolbar-strike-through-button"}
        tooltip={"strike through"}
        isActive={isEditorMarkActive(EFormat.deleted)}
        onButtonClick={() => handleMarkToggle(EFormat.deleted)}
        onPointerDown={preventFocusLoss}
      >
        <FormatStrikeThroughIcon />
      </InspectorButton>
      <InspectorButton
        testId={"text-toolbar-code-button"}
        tooltip={getPlatformTooltip("code (mod-\\)")}
        isActive={isEditorMarkActive(EFormat.code)}
        onButtonClick={() => handleMarkToggle(EFormat.code)}
        onPointerDown={preventFocusLoss}
      >
        <FormatCodeIcon />
      </InspectorButton>
      <InspectorButton
        testId={"text-toolbar-superscript-button"}
        tooltip={getPlatformTooltip("superscript")}
        isActive={isEditorMarkActive(EFormat.superscript)}
        onButtonClick={() => handleSuperSubscriptToggle(EFormat.superscript)}
        onPointerDown={preventFocusLoss}
      >
        <FormatSuperscriptIcon />
      </InspectorButton>
      <InspectorButton
        testId={"text-toolbar-subscript-button"}
        tooltip={getPlatformTooltip("subscript")}
        isActive={isEditorMarkActive(EFormat.subscript)}
        onButtonClick={() => handleSuperSubscriptToggle(EFormat.subscript)}
        onPointerDown={preventFocusLoss}
      >
        <FormatSubscriptIcon />
      </InspectorButton>
      <FormatTextColorButton editor={textModel?.editor} />
      <FormatImageButton editor={textModel?.editor} />
      <FormatLinkButton editor={textModel?.editor} />
      <InspectorButton
        testId={"text-toolbar-heading-1-button"}
        tooltip={"heading 1"}
        isActive={isEditorBlockActive(EFormat.heading1)}
        onButtonClick={() => handleBlockToggle(EFormat.heading1)}
        onPointerDown={preventFocusLoss}
      >
        <FormatHeading1Icon />
      </InspectorButton>
      <InspectorButton
        testId={"text-toolbar-heading-2-button"}
        tooltip={"heading 2"}
        isActive={isEditorBlockActive(EFormat.heading2)}
        onButtonClick={() => handleBlockToggle(EFormat.heading2)}
        onPointerDown={preventFocusLoss}
      >
        <FormatHeading2Icon />
      </InspectorButton>
      <InspectorButton
        testId={"text-toolbar-heading-3-button"}
        tooltip={"heading 3"}
        isActive={isEditorBlockActive(EFormat.heading3)}
        onButtonClick={() => handleBlockToggle(EFormat.heading3)}
        onPointerDown={preventFocusLoss}
      >
        <FormatHeading3Icon />
      </InspectorButton>
      <InspectorButton
        testId={"text-toolbar-quote-button"}
        tooltip={getPlatformTooltip("block quote")}
        isActive={isEditorBlockActive(EFormat.blockQuote)}
        onButtonClick={() => handleBlockToggle(EFormat.blockQuote)}
        onPointerDown={preventFocusLoss}
      >
        <FormatQuoteIcon />
      </InspectorButton>
      <InspectorButton
        testId={"text-toolbar-bulleted-list-button"}
        tooltip={getPlatformTooltip("bulleted list")}
        isActive={isEditorBlockActive(EFormat.bulletedList)}
        onButtonClick={() => handleBlockToggle(EFormat.bulletedList)}
        onPointerDown={preventFocusLoss}
      >
        <FormatListBulletedIcon />
      </InspectorButton>
      <InspectorButton
        testId={"text-toolbar-numbered-list-button"}
        tooltip={getPlatformTooltip("numbered list")}
        isActive={isEditorBlockActive(EFormat.numberedList)}
        onButtonClick={() => handleBlockToggle(EFormat.numberedList)}
        onPointerDown={preventFocusLoss}
      >
        <FormatListNumberedIcon />
      </InspectorButton>
      <InspectorButton
        testId={"text-toolbar-text-decrease-button"}
        tooltip={"text decrease"}
        isDisabled={true}
      >
        <FormatTextDecreaseIcon />
      </InspectorButton>
      <InspectorButton
        testId={"text-toolbar-text-increase-button"}
        tooltip={"text increase"}
        isDisabled={true}
      >
        <FormatTextIncreaseIcon />
      </InspectorButton>
    </InspectorPanel>
  )
})
