import React, { useState } from "react"
import { Button, Menu, MenuButton, MenuItem, MenuList, ModalBody, ModalFooter,
    Tooltip, useDisclosure } from "@chakra-ui/react"
import { observer } from "mobx-react-lite"
import { t } from "../../utilities/translation/translate"
import { getFormulaManager, getSharedModelManager } from "../../models/tiles/tile-environment"
import { getTileComponentInfo } from "../../models/tiles/tile-component-info"
import { kTitleBarHeight } from "../constants"
import { ComponentRect } from "../../utilities/animation-utils"
import { appState } from "../../models/app-state"
import { ISharedDataSet, kSharedDataSetType, SharedDataSet } from "../../models/shared/shared-data-set"
import { ISharedCaseMetadata, kSharedCaseMetadataType, SharedCaseMetadata }
  from "../../models/shared/shared-case-metadata"
import { DataSet, toCanonical } from "../../models/data/data-set"
import { gDataBroker } from "../../models/data/data-broker"
import { isFreeTileLayout } from "../../models/document/free-tile-row"
import { createDefaultTileOfType } from "../../models/codap/add-default-content"
import { kCaseTableTileType } from "./case-table-defs"
import { getPositionOfNewComponent } from "../../utilities/view-utils"
import { CodapModal } from "../codap-modal"
import { uiState } from "../../models/ui-state"
import TableIcon from "../../assets/icons/icon-table.svg"
import TrashIcon from "../../assets/icons/icon-trash.svg"
import AlertIcon from "../../assets/icons/icon-alert.svg"
import { ToolShelfButtonTag } from "../tool-shelf/tool-shelf-button"

import "../tool-shelf/tool-shelf.scss"

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

  if (!row || !content) return null

  const openTableForDataset = (model: ISharedDataSet, caseMetadata: ISharedCaseMetadata) => {
    const caseTableTileId = caseMetadata.caseTableTileId
    const caseTableComponentInfo = getTileComponentInfo(kCaseTableTileType)
    if (!caseTableComponentInfo) return
    if (caseTableTileId) {
      content?.toggleNonDestroyableTileVisibility(caseTableTileId)
      return
    }
    const tile = createDefaultTileOfType(kCaseTableTileType)
    if (!tile) return
    manager?.addTileSharedModel(tile.content, model, true)
    manager?.addTileSharedModel(tile.content, caseMetadata, true)
    caseMetadata.setCaseTableTileId(tile.id)

    const width = caseTableComponentInfo.defaultWidth || 0
    const height = caseTableComponentInfo.defaultHeight || 0
    const {x, y} = getPositionOfNewComponent({width, height})
    const from: ComponentRect = { x: 0, y: 0, width: 0, height: kTitleBarHeight },
      to: ComponentRect = { x, y, width, height: height + kTitleBarHeight}
    content?.insertTileInRow(tile, row, from)
    uiState.setFocusedTile(tile.id)
    const tileLayout = content.getTileLayoutById(tile.id)
    if (!isFreeTileLayout(tileLayout)) return
    // use setTimeout to push the change into a subsequent action
    setTimeout(() => {
      // use applyModelChange to wrap into a single non-undoable action without undo string
      content.applyModelChange(() => {
        tileLayout.setPosition(to.x, to.y)
        tileLayout.setSize(to.width, to.height)
      })
    })
  }

  const handleCreateNewDataSet = () => {
    document.applyModelChange(() => {
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
    }, {
      undoStringKey: "V3.Undo.caseTable.create",
      redoStringKey: "V3.Redo.caseTable.create"
    })
  }

  const handleOpenDataSetTable = (dataset: ISharedDataSet) => {
    const model = manager?.getSharedModelsByType("SharedDataSet")
      .find(m => m.id === dataset.id) as ISharedDataSet | undefined
    const caseMetadata = caseMetadatas?.find(cm => cm.data?.id === model?.dataSet.id)
    if (!model || !caseMetadata) return
    const existingTileId = caseMetadata.lastShownTableOrCardTileId
    if (existingTileId) { // We already have a case table so make sure it's visible and has focus
      const existingTile = content.getTileLayoutById(existingTileId)
      if (isFreeTileLayout(existingTile) && existingTile.isHidden) {
        content?.toggleNonDestroyableTileVisibility(existingTileId)
      }
      uiState.setFocusedTile(existingTileId)
    } else {  // We don't already have a table for this dataset
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
        {datasets?.map((dataset) => {
          // case table title reflects DataSet title
          const tileTitle = dataset.dataSet.title
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
      <MenuButton className="tool-shelf-button table" title={`${t("DG.ToolButtonData.tableButton.toolTip")}`}
          data-testid={"tool-shelf-button-table"}>
        <TableIcon />
        <ToolShelfButtonTag className="table" label={t("DG.ToolButtonData.tableButton.title")} />
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
      document.applyModelChange(() => {
        manager?.removeSharedModel(dataSetId)
        getFormulaManager(document)?.removeDataSet(dataSetId)
      }, {
        undoStringKey: "V3.Undo.caseTable.delete",
        redoStringKey: "V3.Redo.caseTable.delete"
      })
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
                  onClick={b.onClick} data-testid={`delete-data-set-button-${b.className}`}>
                {b.label}
              </Button>
            </Tooltip>
          )
        })}
      </ModalFooter>
    </CodapModal>
  )
}
