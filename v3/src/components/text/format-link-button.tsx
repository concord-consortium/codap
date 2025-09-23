import { ExternalLinkIcon } from "@chakra-ui/icons"
import {
  Button, FormControl, FormLabel, IconButton, Input, InputGroup, InputRightElement,
  ModalBody, ModalCloseButton, ModalFooter, ModalHeader, Portal, Tooltip, VStack
} from "@chakra-ui/react"
import {
  CustomEditor, Editor, EFormat, isCustomElement, LinkElement, NodeEntry, Path, Range,
  ReactEditor, slateToText, Transforms, wrapElement
} from "@concord-consortium/slate-editor"
import React, { useEffect } from "react"
import AddLinkIcon from "../../assets/icons/inspector-panel/add-link-icon.svg"
import { useTileInspectorContext } from "../../hooks/use-tile-inspector-context"
import { CodapModal } from "../codap-modal"
import { InspectorButton } from "../inspector-panel"
import { TextTileInspectorContent } from "./text-tile-inspector-content"

import "../codap-modal-v3.scss"
import "./text-format-dialog.scss"

function getLinkText(linkElt: Maybe<LinkElement>) {
  return linkElt ? slateToText(linkElt.children) : ""
}

export function getSelectedLink(editor: Editor): LinkElement | undefined {
  const { selection } = editor
  if (!selection) return undefined

  // Find the link element at the anchor and focus points
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  const anchorEntry = Editor.above(editor, {
    at: selection.anchor,
    match: n => isCustomElement(n) && n.type === "link"
  }) as NodeEntry<LinkElement> | undefined

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  const focusEntry = Editor.above(editor, {
    at: selection.focus,
    match: n => isCustomElement(n) && n.type === "link"
  }) as NodeEntry<LinkElement> | undefined

  if (anchorEntry && focusEntry && Path.equals(anchorEntry[1], focusEntry[1])) {
    // Ensure the selection is fully within the link element
    const [linkNode, linkPath] = anchorEntry
    const linkRange = Editor.range(editor, linkPath)
    if (Range.includes(linkRange, selection)) {
      return linkNode
    }
  }
  return undefined
}

interface IProps {
  editor: Maybe<CustomEditor>
}

export function FormatLinkButton({ editor }: IProps) {

  const [tileInspectorContent] = useTileInspectorContext()
  const textTileInspectorContent = tileInspectorContent instanceof TextTileInspectorContent
                                    ? tileInspectorContent : undefined
  const { isLinkDialogOpen = false, openLinkDialog, closeLinkDialog, editLink } = textTileInspectorContent || {}

  function handlePointerDown() {
    if (editor && editLink) {
      editLink.current = getSelectedLink(editor)
    }
    openLinkDialog?.()
  }

  function handleClose() {
    closeLinkDialog?.()
  }

  function handleSave(link: { text: string, url: string }) {
    // save the link contents
    if (editor) {
      const linkText = link.text || link.url
      const _editLink = editLink?.current
      const linkPath = _editLink && ReactEditor.findPath(editor, _editLink)
      linkPath && Transforms.removeNodes(editor, { at: linkPath })
      if (link.url) {
        wrapElement(editor, EFormat.link, { href: link.url }, linkText)
      }
      else if (link.text) {
        Transforms.insertText(editor, linkText)
      }
    }

    handleClose()
  }

  return (
    <>
      <InspectorButton
        testId={"text-toolbar-add-link-button"}
        tooltip={"add link"}
        isActive={!!editor?.isElementActive(EFormat.link)}
        // disable the button if the selection doesn't uniquely identify a link or potential link
        isDisabled={!(editor && (getSelectedLink(editor) || !editor?.isElementActive(EFormat.link)))}
        onPointerDown={handlePointerDown}
      >
        <AddLinkIcon />
      </InspectorButton>
      <Portal>
        <LinkDialog editor={editor} editLink={editLink}
                    isOpen={isLinkDialogOpen} onClose={handleClose} onSave={handleSave} />
      </Portal>
    </>
  )
}

interface ILinkDialogProps {
  editor: Maybe<CustomEditor>
  isOpen: boolean
  onClose: () => void
  onSave: (link: { text: string, url: string }) => void
  editLink?: React.MutableRefObject<Maybe<LinkElement>>
}

function LinkDialog({ editor, isOpen, onClose, onSave, editLink }: ILinkDialogProps) {
  const [linkText, setLinkText] = React.useState("")
  const [linkUrl, setLinkUrl] = React.useState("")

  useEffect(() => {
    if (isOpen) {
      if (editLink?.current) {
        setLinkText(getLinkText(editLink.current))
        setLinkUrl(editLink.current.href)
      }
      else if (editor) {
        setLinkText(editor.selection ? Editor.string(editor, editor.selection) : "")
        setLinkUrl("")
      }
    }
  }, [editor, editLink, isOpen])

  function handleClose() {
    onClose()
  }

  function handleSave() {
    onSave({ text: linkText, url: linkUrl })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault()
      handleSave()
    }
  }

  const inputBorderProps = {
    border: "1px solid #006c8e",
    borderRadius: "4px"
  }

  return (
    <CodapModal
      isOpen={isOpen}
      onClose={onClose}
      onKeyDown={handleKeyDown}
      modalWidth={"450px"}
      modalHeight={"221px"}
    >
      <ModalHeader h="34px" className="codap-modal-header-v3" fontSize="md" data-testid="codap-modal-header">
        <div className="codap-modal-icon-container-v3">
          <AddLinkIcon />
        </div>
        <div className="codap-header-title-v3">Insert Link</div>
        <ModalCloseButton onClick={onClose} data-testid="modal-close-button"/>
      </ModalHeader>
      <ModalBody className="text-format-dialog-body" pt="3" pb="2">
        <VStack align="stretch" spacing="3">
          <FormControl>
            <FormLabel fontSize="sm" mb="1">Link Text</FormLabel>
            <Input
              size="sm" h="30px" paddingInlineStart={"5px"}
              {...inputBorderProps}
              placeholder="Text"
              value={linkText}
              onChange={(e) => setLinkText(e.target.value)}
              data-testid="link-dialog-text"
            />
          </FormControl>

          <FormControl>
            <FormLabel fontSize="sm" mb="1">Link URL</FormLabel>
            <InputGroup size="sm">
              <Input
                size="sm" h="30px" paddingInlineStart={"5px"}
                {...inputBorderProps}
                placeholder="URL"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                data-testid="link-dialog-url"
              />
              <InputRightElement>
                <IconButton
                  aria-label="Open link in new tab"
                  icon={<ExternalLinkIcon />}
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (linkUrl) {
                      window.open(linkUrl, "_blank", "noopener,noreferrer")
                    }
                  }}
                />
              </InputRightElement>
            </InputGroup>
          </FormControl>
        </VStack>
      </ModalBody>
      <ModalFooter mt="-5">
        <Tooltip label={"Cancel"} fontSize="14px"
          color="white" openDelay={1000} placement="bottom" bottom="5px" left="15px"
          data-testid="modal-cancel-button-tooltip">
          <Button size="xs" variant={"v3Clear"} ml="3" onClick={handleClose}
              data-testid={"link-dialog-cancel-button"}>
            Cancel
          </Button>
        </Tooltip>
        <Tooltip label={"Save"} fontSize="14px"
          color="white" openDelay={1000} placement="bottom" bottom="5px" left="15px"
          data-testid="modal-save-button-tooltip">
          <Button size="xs" variant={"v3Default"} ml="3" onClick={handleSave}
              data-testid={"link-dialog-save-button"}>
            Save
          </Button>
        </Tooltip>
      </ModalFooter>
    </CodapModal>
  )
}
