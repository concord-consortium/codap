import React, { useState } from "react"
import { Button, Menu, MenuButton, MenuItem, MenuList, ModalBody, ModalFooter,
    Tag, Tooltip, useDisclosure } from "@chakra-ui/react"
import { observer } from "mobx-react-lite"
import t from "../../utilities/translation/translate"
import { getFormulaManager, getSharedModelManager } from "../../models/tiles/tile-environment"
import { appState } from "../../models/app-state"
import { ISharedDataSet, kSharedDataSetType, SharedDataSet } from "../../models/shared/shared-data-set"
import { ISharedCaseMetadata, kSharedCaseMetadataType, SharedCaseMetadata }
  from "../../models/shared/shared-case-metadata"
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
  const caseMetadatas = manager?.getSharedModelsByType<typeof SharedCaseMetadata>(kSharedCaseMetadataType)
  const row = content?.getRowByIndex(0)
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [modalOpen, setModalOpen] = useState(false)
  const [dataSetIdToDeleteId, setDataSetIdToDelete] = useState("")

  if (!row) return null

  const openTableForDataset = (model: ISharedDataSet, caseMetadata: ISharedCaseMetadata) => {
    const tile = createDefaultTileOfType(kCaseTableTileType)
    if (!tile) return
    manager?.addTileSharedModel(tile.content, model, true)
    manager?.addTileSharedModel(tile.content, caseMetadata, true)

    const width = kDefaultTableSize.width
    const height = kDefaultTableSize.height
    const {x, y} = getPositionOfNewComponent({width, height})
    content?.insertTileInRow(tile, row, {x, y, width, height})
    uiState.setFocusedTile(tile.id)
  }

  const handleCreateNewDataSet = () => {
    document.applyUndoableAction(() => {
      const newData = [{ AttributeName: "" }]
      const ds = DataSet.create({ name: t("DG.AppController.createDataSet.name")})
      ds.addAttribute({ name: t("DG.AppController.createDataSet.initialAttribute") })
      ds.addCases(toCanonical(ds, newData))
      const tile = createDefaultTileOfType(kCaseTableTileType)
      if (!tile) return
      const { sharedData, caseMetadata } = gDataBroker.addDataSet(ds, tile.id)
      // Add dataset to the formula manager
      getFormulaManager(document)?.addDataSet(ds)
      openTableForDataset(sharedData, caseMetadata)
    }, "V3.Undo.caseTable.create", "V3.Redo.caseTable.create")
  }

  const handleOpenDataSetTable = (dataset: ISharedDataSet) => {
    const model = manager?.getSharedModelsByType("SharedDataSet")
                    .find(m =>  m.id === dataset.id) as ISharedDataSet | undefined
    const caseMetadata = caseMetadatas?.find(cm => cm.data?.id === model?.dataSet.id)
    if (!model || !caseMetadata) return
    const tiles = manager?.getSharedModelTiles(model)
    const tableTile = tiles?.find(tile => tile.content.type === kCaseTableTileType)
    if (tableTile) { // a case table for the data set already exists in document
      uiState.setFocusedTile(tableTile.id)
    }
    else { // opens a table for the selected dataset and add it to the shared model manager
      openTableForDataset(model, caseMetadata)
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
        {datasets?.map((dataset, idx) => {
          const model = datasets.find(m =>  m.id === dataset.id) as ISharedDataSet | undefined
          const caseMetadata = caseMetadatas?.find(cm => cm.data?.id === model?.dataSet.id)
          const tiles = manager?.getSharedModelTiles(model)
          const tableTile = tiles?.find(tile => tile.content.type === kCaseTableTileType)
          const tileTitle = caseMetadata?.title ? caseMetadata?.title
                                                : tableTile?.title ? tableTile?.title : dataset.dataSet.name
          return (
            <MenuItem key={`${dataset.dataSet.id}`} onClick={()=>handleOpenDataSetTable(dataset)}
              data-testid={`tool-shelf-table-${tileTitle}`}>
              {tileTitle}
              <TrashIcon className="tool-shelf-menu-trash-icon"
                  onClick={() => handleOpenRemoveDataSetModal(dataset.dataSet.id)} />
            </MenuItem>
          )
        })}
        <MenuItem data-testid="tool-shelf-table-new-clipboard">
          {t("DG.AppController.caseTableMenu.clipboardDataset")}
        </MenuItem>
        <MenuItem onClick={handleCreateNewDataSet} data-testid="tool-shelf-table-new">
          {t("DG.AppController.caseTableMenu.newDataSet")}
        </MenuItem>
      </MenuList>
      {modalOpen &&
        <DeleteDataSetModal dataSetId={dataSetIdToDeleteId} isOpen={isOpen} onClose={onClose}
            setModalOpen={setModalOpen}/>
      }
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
  const manager = getSharedModelManager(document)

  const handleCancel = () => {
    setModalOpen(false)
    onClose()
  }
  const handleDeleteDataSet = () => {
    setModalOpen(false)
    onClose()
    if (dataSetId) {
      manager?.removeSharedModel(dataSetId)
      gDataBroker.removeDataSet(dataSetId)
      getFormulaManager(document)?.removeDataSet(dataSetId)
    }
  }

  const buttons = [{label: t("DG.TableController.deleteDataSet.cancelButtonTitle"),
                    className: "cancel",
                    onClick: handleCancel
                   },
                   {
                    label: t("DG.TableController.deleteDataSet.okButtonTitle"),
                    className: "delete",
                    onClick: handleDeleteDataSet
                   }]

  return (
    <CodapModal isOpen={isOpen} onClose={onClose} modalWidth={"500px"} modalHeight={"129px"}
      data-testid="delete-data-set-modal">
      <ModalBody className="delete-data-set-modal-body">
        <AlertIcon />
        <div className="delete-data-set-modal-text">
          <p className="warning">
            {t("DG.TableController.deleteDataSet.confirmMessage", { vars: [data?.name || ""] })}
          </p>
          <p className="description">{t("DG.TableController.deleteDataSet.confirmDescription")}</p>
        </div>
      </ModalBody>
      <ModalFooter className="delete-data-set-modal-footer">
        {buttons.map((b: any, i) => {
          const key = `${i}-${b.className}`
          return (
            <Tooltip key={`delete-data-set-button-${key}`} label={b.tooltip} h="20px" fontSize="12px"
              color="white" openDelay={1000} placement="bottom" bottom="15px" left="15px"
              data-testid="modal-tooltip">
              <Button key={key} className={`delete-data-set-button-${b.className}`} size="xs" variant="ghost" ml="5"
                  onClick={b.onClick} data-testid={`${b.label}-button`}>
                {b.label}
              </Button>
            </Tooltip>
          )
        })}
      </ModalFooter>
    </CodapModal>
  )
}
