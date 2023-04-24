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
  const [dataSetToDelete, setDataSetToDelete] = useState("")

  if (!row) return null

  const handleCreateNewDataSet = () => {
    const newData = [{ AttributeName: "" }]
    const ds = DataSet.create({ name: "New Dataset" })
    ds.addAttribute({ name: "AttributeName" })
    ds.addCases(toCanonical(ds, newData))
    gDataBroker.addDataSet(ds)
    createDefaultTileOfType(kCaseTableTileType)
  }

  const handleOpenDataSetTable = () => {
    if (existingTableTiles?.length !== 0) {
      // we're going to assume there's only one table in the document for now and it belongs to the dataset
      uiState.setFocusedTile(tileIds[0])
    } else {
      const tableTile = createDefaultTileOfType(kCaseTableTileType)
      if (!tableTile) return
      const tileSize = { width: 580, height: 300 }
      const { x, y } = getPositionOfNewComponent(tileSize)
      const tableOptions = { x, y, width: 580, height: 300 }
      content?.insertTileInRow(tableTile, row, tableOptions)
    }
  }

  //not yet functional
  //CODAP crashes with an MST error in the data-configuration model
  const handleRemoveDataSet = (dsId: string) => {
    setModalOpen(true)
    onOpen()
    setDataSetToDelete(dsId)
  }

  return (
    <>
      <MenuList>
        {datasets?.map((ds, idx) => {
          const dataSetName = ds.dataSet.name
          return (
            <MenuItem key={`${dataSetName}-${idx}`} onClick={handleOpenDataSetTable}>
              {dataSetName}
              <TrashIcon className="tool-shelf-menu-trash-icon" onClick={() => handleRemoveDataSet(ds.dataSet.id)} />
            </MenuItem>
          )
        })}
        <MenuItem>{t("DG.AppController.caseTableMenu.clipboardDataset")}</MenuItem>
        <MenuItem onClick={handleCreateNewDataSet}>{t("DG.AppController.caseTableMenu.newDataSet")}</MenuItem>
      </MenuList>
      {modalOpen &&
        <DeleteDataSetModal dataSetId={dataSetToDelete} isOpen={isOpen} onClose={onClose}setModalOpen={setModalOpen}/>}
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
  const handleCancel = () => {
    setModalOpen(false)
    onClose()
  }
  const handleDeleteDataSet = () => {
    console.log("delete data set")
    setModalOpen(false)
    onClose()
    if (dataSetId) {
      console.log("dataSetId", dataSetId)
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
    <CodapModal isOpen={isOpen} onClose={onClose} data-testid="delete-data-set-modal">
      <ModalBody className="delete-data-set-modal-body">
        <AlertIcon />
        <div className="delete-data-set-modal-text">
          <p className="warning">{t("DG.TableController.deleteDataSet.confirmMessage")}</p>
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
