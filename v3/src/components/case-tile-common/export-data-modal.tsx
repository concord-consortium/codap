import {
  Box, Button, Flex, FormControl, FormLabel, List, ListItem, ModalBody, ModalFooter, Tooltip
} from "@chakra-ui/react"
import React, { useState } from "react"
import { observer } from "mobx-react-lite"
import { clsx } from "clsx"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { ICollectionModel } from "../../models/data/collection"
import { IDataSet } from "../../models/data/data-set"
import { isCommandKeyDown } from "../../utilities/platform-utils"
import { t } from "../../utilities/translation/translate"
import { CodapModal } from "../codap-modal"

import "./export-data-modal.scss"

interface IProps {
  isOpen: boolean
  prompt: string
  okLabel: string
  okTooltip: string
  onClose?: () => void
  onComplete: (dataSet: IDataSet, selectedCollection: Maybe<ICollectionModel>) => void
}

export const ExportDataModal = observer(function ExportDataModal({
  isOpen, prompt, okLabel, okTooltip, onClose, onComplete
}: IProps) {
  const dataSet = useDataSetContext()
  const collections = dataSet?.collections

  const [selectedCollectionId, setSelectedCollectionId] = useState(collections?.[0]?.id || "")
  const [showCollectionsMenu, setShowCollectionsMenu] = useState(false)
  const selectedCollection = collections?.find(c => c.id === selectedCollectionId)
  const allCollectionsName = t("DG.CaseTableController.allTables")
  const selectedCollectionName = selectedCollection?.name || allCollectionsName

  const closeModal = () => {
    setShowCollectionsMenu(false)
    onClose?.()
  }

  const applyAndClose = () => {
    if (dataSet) {
      onComplete(dataSet, selectedCollection)
    }
    closeModal()
  }

  const handleSelectCollection = (collectionId: string) => {
    setSelectedCollectionId(collectionId)
    setShowCollectionsMenu(false)
  }

  const handleModalWhitespaceClick = () => {
    setShowCollectionsMenu(false)
  }

  const handleCollectionsMenuToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowCollectionsMenu(!showCollectionsMenu)
  }

  const footerButtons = [{
    label: okLabel,
    tooltip: okTooltip,
    onClick: applyAndClose,
    default: true
  }, {
    label: t("DG.AppController.exportDocument.cancelTitle"),
    tooltip: t("DG.AppController.exportDocument.cancelTooltip"),
    onClick: closeModal
  }]

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Enter" && isCommandKeyDown(event)) {
      applyAndClose()
    }
    if (event.key === "Escape") {
      closeModal()
    }
    event.stopPropagation()
  }

  return (
    <CodapModal
      isOpen={isOpen}
      onClose={closeModal}
      modalWidth={`400px`}
      modalHeight={`120px`}
      onClick={handleModalWhitespaceClick}
    >
      <ModalBody className="export-data-modal-body" onKeyDown={handleKeyDown}>
        <FormControl className="export-data-form-control">
          <FormLabel className="collections-label">
            {prompt}
            <Box position="relative">
              <Button
                className={clsx("collections-button", {"menu-open": showCollectionsMenu})}
                size="xs"
                ml="5"
                onClick={handleCollectionsMenuToggle}
                data-testid="export-data-collections-button"
              >
                {selectedCollectionName}
              </Button>
              {showCollectionsMenu &&
                <Flex className="collection-list-container" data-testid="formula-value-list">
                  <List className="collection-list">
                    { collections?.map(collection => (
                      <ListItem
                        className="collection-list-item"
                        key={collection.id}
                        onClick={() => handleSelectCollection(collection.id)}
                      >
                        {collection.name}
                      </ListItem>
                    ))}
                    <ListItem
                      className="collection-list-item bottom-item"
                      onClick={() => handleSelectCollection("")}
                    >
                      {allCollectionsName}
                    </ListItem>
                  </List>
                </Flex>
              }
            </Box>
          </FormLabel>
        </FormControl>
      </ModalBody>
      <ModalFooter mt="-5" className="export-data-modal-footer">
        { footerButtons.map((b, idx) => {
            const key = `${idx}-${b.label}`
            return (
              <Tooltip key={idx} label={b.tooltip} h="20px" fontSize="12px" color="white" openDelay={1000}
                placement="bottom" bottom="15px" left="15px" data-testid="modal-tooltip"
              >
                <Button key={key} size="xs" variant={`${b.default ? "default" : ""}`} ml="5" onClick={b.onClick}
                      _hover={{backgroundColor: "#72bfca", color: "white"}} data-testid={`${b.label}-button`}>
                  {b.label}
                </Button>
              </Tooltip>
            )
          })
        }
      </ModalFooter>
    </CodapModal>
  )
})
