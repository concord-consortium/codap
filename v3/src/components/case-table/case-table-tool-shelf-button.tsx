import React, { useState } from "react"
import { Button, Menu, MenuButton, MenuItem, MenuList, ModalBody, ModalFooter,
    Tag, Tooltip, useDisclosure } from "@chakra-ui/react"
import { observer } from "mobx-react-lite"
import t from "../../utilities/translation/translate"
import { getSharedModelManager } from "../../models/tiles/tile-environment"
import { appState } from "../../models/app-state"
import { kSharedDataSetType, SharedDataSet } from "../../models/shared/shared-data-set"
import { DataSet, toCanonical } from "../../models/data/data-set"
import { gDataBroker } from "../../models/data/data-broker"
import { createDefaultTileOfType } from "../../models/codap/add-default-content"
import { kCaseTableTileType } from "./case-table-defs"
import { getPositionOfNewComponent } from "../../utilities/view-utils"
import { CodapModal } from "../codap-modal"
import { uiState } from "../../models/ui-state"
import TableIcon from "../../assets/icons/icon-table.svg"
import TrashIcon from "../../assets/icons/icon-trash.svg"
import AlertIcon from "../../assets/icons/icon-alert.svg"

import "../tool-shelf/tool-shelf.scss"

const kDefaultTableSize = { width: 186, height: 200 }

export const CaseTableToolShelfMenuList = observer(function CaseTableToolShelfMenuList() {
  const document = appState.document
  const content = document.content
  const manager = getSharedModelManager(document)
  const datasets = manager?.getSharedModelsByType<typeof SharedDataSet>(kSharedDataSetType)
  const existingTableTiles = document.content?.getTilesOfType(kCaseTableTileType)
  const tileIds: string[] = []
  existingTableTiles?.forEach(tile => tileIds.push(tile.id))
  const row = content?.getRowByIndex(0)
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [modalOpen, setModalOpen] = useState(false)
  const [dataSetIdToDeleteId, setDataSetIdToDelete] = useState("")

  if (!row) return null

  const handleCreateNewDataSet = () => {
    const tile = createDefaultTileOfType(kCaseTableTileType)
    if (!tile) return
    const newData = [{ AttributeName: "" }]
    const ds = DataSet.create({ name: "New Dataset" })
    ds.addAttribute({ name: "AttributeName" })
    ds.addCases(toCanonical(ds, newData))
    const { sharedData, caseMetadata } = gDataBroker.addDataSet(ds, tile.id)
    manager?.addTileSharedModel(tile.content, sharedData, true)
    manager?.addTileSharedModel(tile.content, caseMetadata, true)

    const width = kDefaultTableSize.width
    const height = kDefaultTableSize.height
    const {x, y} = getPositionOfNewComponent({width, height})
    content?.insertTileInRow(tile, row, {x, y, width, height})
  }

  const handleOpenDataSetTable = (dsId: string) => {
    if (existingTableTiles?.length !== 0) {
      gDataBroker.setSelectedDataSetId(dsId)
      // we're going to assume there's only one table in the document for now and it belongs to the dataset
      uiState.setFocusedTile(tileIds[0])
    }
  }

  const handleOpenRemoveDataSetModal = (dsId: string) => {
    setModalOpen(true)
    onOpen()
    setDataSetIdToDelete(dsId)
  }
  return (
    <>
      <MenuList>
        {datasets?.map((ds, idx) => {
          return (
            <MenuItem key={`${ds.dataSet.id}`} onClick={()=>handleOpenDataSetTable(ds.dataSet.id)}>
              {ds.dataSet.name}
              <TrashIcon className="tool-shelf-menu-trash-icon" onClick={() => handleOpenRemoveDataSetModal(ds.dataSet.id)} />
            </MenuItem>
          )
        })}
        <MenuItem>{t("DG.AppController.caseTableMenu.clipboardDataset")}</MenuItem>
        <MenuItem onClick={handleCreateNewDataSet}>{t("DG.AppController.caseTableMenu.newDataSet")}</MenuItem>
      </MenuList>
      {modalOpen &&
        <DeleteDataSetModal dataSetId={dataSetIdToDeleteId} isOpen={isOpen} onClose={onClose}setModalOpen={setModalOpen}/>}
    </>
  )
})

export const CaseTableToolShelfButton = () => {
  return (
    <Menu isLazy>
      <MenuButton className="tool-shelf-button menu table" title={`${t("DG.ToolButtonData.tableButton.toolTip")}`}
          data-testid={"tool-shelf-button-table"}>
        <TableIcon />
        <Tag className='tool-shelf-tool-label table'>{t("DG.ToolButtonData.tableButton.title")}</Tag>
      </MenuButton>
      <CaseTableToolShelfMenuList />
    </Menu>
  )
}

interface IDeleteDataSetModalProps {
  dataSetId: string
  isOpen: boolean
  onClose: () => void
  setModalOpen: (show: boolean) => void
}

export const DeleteDataSetModal = ({dataSetId, isOpen, onClose, setModalOpen}: IDeleteDataSetModalProps) => {
  const data = gDataBroker.getDataSet(dataSetId)
  const document = appState.document
  const content = document.content
  const manager = getSharedModelManager(document)

  const handleCancel = () => {
    setModalOpen(false)
    onClose()
  }
  const handleDeleteDataSet = () => {
    console.log("delete data set")
    setModalOpen(false)
    onClose()
    if (dataSetId) {
      console.log("in tool shelf button dataSetId", dataSetId)
      manager?.removeSharedModel(dataSetId)
      gDataBroker.removeDataSet(dataSetId)
    }
  }

  const buttons = [{label: t("DG.TableController.deleteDataSet.cancelButtonTitle"),
                    onClick: handleCancel
                   },
                   {
                    label: t("DG.TableController.deleteDataSet.okButtonTitle"),
                    onClick: handleDeleteDataSet
                   }]

  return (
    <CodapModal isOpen={isOpen} onClose={onClose} modalWidth={"500px"} data-testid="delete-data-set-modal">
      <ModalBody className="delete-data-set-modal-body">
        <AlertIcon />
        <div className="delete-data-set-modal-text">
          <p className="warning">
            {t("DG.TableController.deleteDataSet.confirmMessage", { vars: [data?.name || ""] })}
          </p>
          <p className="description">{t("DG.TableController.deleteDataSet.confirmDescription")}</p>
        </div>
      </ModalBody>
      <ModalFooter>
        {buttons.map((b: any, i) => {
          const key = `${i}-${b.className}`
          return (
            <Tooltip key={`delete-data-set-button-${key}`} label={b.tooltip} h="20px" fontSize="12px"
              color="white" openDelay={1000} placement="bottom" bottom="15px" left="15px"
              data-testid="modal-tooltip">
              <Button key={key} size="xs" variant="ghost" ml="5" onClick={b.onClick} data-testid={`${b.label}-button`}>
                {b.label}
              </Button>
            </Tooltip>
          )
        })}
      </ModalFooter>
    </CodapModal>
  )
}
