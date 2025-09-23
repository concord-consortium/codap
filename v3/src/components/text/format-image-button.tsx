import { ChevronDownIcon } from "@chakra-ui/icons"
import {
  Box, Button, Checkbox, FormControl, FormLabel, HStack, Input, Menu, MenuButton, MenuItem, MenuList,
  ModalBody, ModalCloseButton, ModalFooter, ModalHeader, NumberInput, NumberInputField, Portal,
  SimpleGrid, Tooltip, VStack
} from "@chakra-ui/react"
import {
  CustomEditor, Editor, EFormat, ImageElement, isCustomElement, NodeEntry, Path, Range, ReactEditor, Transforms
} from "@concord-consortium/slate-editor"
import React, { useEffect } from "react"
import AddImageIcon from "../../assets/icons/inspector-panel/add-image-icon.svg"
import FloatLeftImageIcon from "../../assets/icons/inspector-panel/format-image-left-icon.svg"
import FloatRightImageIcon from "../../assets/icons/inspector-panel/format-image-right-icon.svg"
import InlineImageIcon from "../../assets/icons/inspector-panel/format-image-inline-icon.svg"
import { useTileInspectorContext } from "../../hooks/use-tile-inspector-context"
import { CodapModal } from "../codap-modal"
import { InspectorButton } from "../inspector-panel"
import { TextTileInspectorContent } from "./text-tile-inspector-content"

import "../codap-modal-v3.scss"
import "./text-format-dialog.scss"

export function getSelectedImage(editor: Editor): ImageElement | undefined {
  const { selection } = editor
  if (!selection) return undefined

  // Find the image element at the anchor and focus points
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  const anchorEntry = Editor.above(editor, {
    at: selection.anchor,
    match: n => isCustomElement(n) && n.type === "image"
  }) as NodeEntry<ImageElement> | undefined

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  const focusEntry = Editor.above(editor, {
    at: selection.focus,
    match: n => isCustomElement(n) && n.type === "image"
  }) as NodeEntry<ImageElement> | undefined

  if (anchorEntry && focusEntry && Path.equals(anchorEntry[1], focusEntry[1])) {
    // Ensure the selection is fully within the image element
    const [imageNode, imagePath] = anchorEntry
    const imageRange = Editor.range(editor, imagePath)
    if (Range.includes(imageRange, selection)) {
      return imageNode
    }
  }
  return undefined
}

interface IProps {
  editor: Maybe<CustomEditor>
}

export function FormatImageButton({ editor }: IProps) {

  const [tileInspectorContent] = useTileInspectorContext()
  const textTileInspectorContent = tileInspectorContent instanceof TextTileInspectorContent
                                    ? tileInspectorContent : undefined
  const { isImageDialogOpen = false, openImageDialog, closeImageDialog, editImage } = textTileInspectorContent || {}

  function handlePointerDown() {
    if (editor && editImage) {
      editImage.current = getSelectedImage(editor)
    }
    openImageDialog?.()
  }

  function handleSave(imageElt: ImageElement) {
    // save the image contents
    if (editor) {
      // if editing an existing node, remove the original before inserting the replacement
      const _editImage = editImage?.current
      const imagePath = _editImage && ReactEditor.findPath(editor, _editImage)
      imagePath && Transforms.removeNodes(editor, { at: imagePath })
      Transforms.insertNodes(editor, imageElt, { select: !!_editImage })
    }

    handleClose()
  }

  function handleClose() {
    closeImageDialog?.()
  }

  return (
    <>
      <InspectorButton
        testId={"text-toolbar-add-image-button"}
        tooltip={"add image"}
        isActive={!!editor?.isElementActive(EFormat.image)}
        // disable the button if the selection doesn't uniquely identify an image or potential image
        isDisabled={!(editor && (getSelectedImage(editor) || !editor?.isElementActive(EFormat.image)))}
        onPointerDown={handlePointerDown}
      >
        <AddImageIcon />
      </InspectorButton>
      <Portal>
        <ImageDialog isOpen={isImageDialogOpen} onClose={handleClose} onSave={handleSave} editImage={editImage} />
      </Portal>
    </>
  )
}

interface IImageDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (imageElt: ImageElement) => void
  editImage?: React.MutableRefObject<Maybe<ImageElement>>
}

function ImageDialog({ isOpen, onClose, onSave, editImage }: IImageDialogProps) {
  const [url, setUrl] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [width, setWidth] = React.useState<Maybe<number | string>>()
  const [height, setHeight] = React.useState<Maybe<number | string>>()
  const [lockAspectRatio, setLockAspectRatio] = React.useState(true)
  type Placement = "inline" | "left" | "right"
  const [placement, setPlacement] = React.useState<Placement>("inline")

  useEffect(() => {
    if (isOpen && editImage) {
      setUrl(editImage.current?.src ?? "")
      setDescription(editImage.current?.alt ?? "")
      setWidth(editImage.current?.width)
      setHeight(editImage.current?.height)
      setLockAspectRatio(editImage.current?.constrain ?? true)
      setPlacement(editImage.current?.float ?? "inline")
    }
  }, [editImage, isOpen])

  const inputBorderProps = {
    border: "1px solid #006c8e",
    borderRadius: "4px"
  }
  const placementLabel =
    placement === "left" ? "Float Left" :
    placement === "right" ? "Float Right" : "Inline"

  function handleSave() {
    onSave({
      type: "image",
      src: url,
      alt: description,
      width: width != null && isFinite(+width) ? +width : undefined,
      height: height != null && isFinite(+height) ? +height : undefined,
      constrain: lockAspectRatio,
      float: placement === "left" ? "left" :
            placement === "right" ? "right" : undefined,
      children: [{ text: '' }]
    })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault()
      handleSave()
    }
  }

  return (
    <CodapModal
      isOpen={isOpen}
      onClose={onClose}
      onKeyDown={handleKeyDown}
      modalWidth={"450px"}
      modalHeight={"311px"}
    >
      <ModalHeader h="34px" className="codap-modal-header-v3" fontSize="md" data-testid="codap-modal-header">
        <div className="codap-modal-icon-container-v3">
          <AddImageIcon />
        </div>
        <div className="codap-header-title-v3">Insert Image</div>
        <ModalCloseButton onClick={onClose} data-testid="modal-close-button"/>
      </ModalHeader>
      <ModalBody className="text-format-dialog-body" pt="3" pb="2">
        <VStack align="stretch" spacing="3">
          <FormControl>
            <FormLabel fontSize="sm" mb="1">Image URL</FormLabel>
            <Input
              size="sm" h="30px"
              {...inputBorderProps}
              placeholder="URL"
              value={url}
              onChange={e => setUrl(e.target.value)}
              data-testid="image-dialog-url"
            />
          </FormControl>

          <FormControl>
            <FormLabel fontSize="sm" mb="1">Description</FormLabel>
            <Input
              size="sm" h="30px"
              {...inputBorderProps}
              placeholder="Describe the image"
              value={description}
              onChange={e => setDescription(e.target.value)}
              data-testid="image-dialog-description"
            />
          </FormControl>

          {/* Dimensions and Placement row */}
          <SimpleGrid columns={2} spacing="4">
            <VStack align="stretch" spacing="2">
              <FormLabel fontSize="sm" mb="0">Dimensions</FormLabel>
              <HStack>
                <NumberInput size="sm" w="90px" h="30px" {...inputBorderProps}
                  min={1} max={1536} value={width} onChange={(_, v) => setWidth(isNaN(v) ? "" : v)}>
                  <NumberInputField placeholder="Width" />
                </NumberInput>
                <Box as="span" fontSize="sm">×</Box>
                <NumberInput size="sm" w="100px" h="30px" {...inputBorderProps}
                  min={1} max={1024} value={height} onChange={(_, v) => setHeight(isNaN(v) ? "" : v)}>
                  <NumberInputField placeholder="Height" />
                </NumberInput>
                <Box as="span" fontSize="sm">px</Box>
              </HStack>
              <Checkbox
                size="sm"
                isChecked={lockAspectRatio}
                onChange={e => setLockAspectRatio(e.target.checked)}
                data-testid="image-dialog-lock-aspect"
              >
                Lock aspect ratio
              </Checkbox>
            </VStack>

            <VStack align="stretch" spacing="2">
              <FormLabel fontSize="sm" mb="0">Placement</FormLabel>
              <Menu>
                <MenuButton
                  as={Button}
                  size="sm"
                  variant="outline"
                  rightIcon={<ChevronDownIcon />}
                  textAlign="left"
                  justifyContent="space-between"
                  w="full"
                  data-testid="image-dialog-placement"
                >
                  {placementLabel}
                </MenuButton>
                <MenuList>
                  <MenuItem onClick={() => setPlacement("inline")}>
                    <InlineImageIcon />
                    Inline
                  </MenuItem>
                  <MenuItem onClick={() => setPlacement("left")}>
                    <FloatLeftImageIcon />
                    Float Left
                  </MenuItem>
                  <MenuItem onClick={() => setPlacement("right")}>
                    <FloatRightImageIcon />
                    Float Right
                  </MenuItem>
                </MenuList>
              </Menu>
            </VStack>
          </SimpleGrid>
        </VStack>
      </ModalBody>
      <ModalFooter mt="-5">
        <Tooltip label={"Cancel"} fontSize="14px"
          color="white" openDelay={1000} placement="bottom" bottom="5px" left="15px"
          data-testid="modal-cancel-button-tooltip">
          <Button size="xs" variant={"v3Clear"} ml="3" onClick={onClose}
              data-testid={"image-dialog-cancel-button"}>
            Cancel
          </Button>
        </Tooltip>
        <Tooltip label={"Save"} fontSize="14px"
          color="white" openDelay={1000} placement="bottom" bottom="5px" left="15px"
          data-testid="modal-save-button-tooltip">
          <Button size="xs" variant={"v3Default"} ml="3" onClick={handleSave}
              data-testid={"image-dialog-save-button"}>
            Save
          </Button>
        </Tooltip>
      </ModalFooter>
    </CodapModal>
  )
}
