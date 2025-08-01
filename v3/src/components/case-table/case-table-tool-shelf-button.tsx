import React, { useState } from "react"
import { Button, Menu, MenuButton, MenuItem, MenuList, ModalBody, ModalFooter,
    Tooltip, useDisclosure } from "@chakra-ui/react"
import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import { logStringifiedObjectMessage } from "../../lib/log-message"
import { appState } from "../../models/app-state"
import { createDefaultTileOfType } from "../../models/codap/add-default-content"
import { INewTileOptions } from "../../models/codap/create-tile"
import { gDataBroker } from "../../models/data/data-broker"
import { DataSet } from "../../models/data/data-set"
import {
  dataContextCountChangedNotification, dataContextDeletedNotification
} from "../../models/data/data-set-notifications"
import { kSharedDataSetType, SharedDataSet } from "../../models/shared/shared-data-set"
import { getFormulaManager, getSharedModelManager } from "../../models/tiles/tile-environment"
import { ITileModel } from "../../models/tiles/tile-model"
import { createTileNotification } from "../../models/tiles/tile-notifications"
import { uniqueName } from "../../utilities/js-utils"
import { getSpecialLangFontClassName } from "../../utilities/translation/languages"
import { gLocale } from "../../utilities/translation/locale"
import { t } from "../../utilities/translation/translate"
import { createOrShowTableOrCardForDataset, createTableOrCardForDataset } from "../case-tile-common/case-tile-utils"
import { CodapModal } from "../codap-modal"
import { ToolShelfButtonTag } from "../tool-shelf/tool-shelf-button"
import { kCaseTableTileType } from "./case-table-defs"

import AlertIcon from "../../assets/icons/icon-alert.svg"
import TableIcon from "../../assets/icons/icon-table.svg"
import TrashIcon from "../../assets/icons/icon-trash.svg"

import "../tool-shelf/tool-shelf.scss"

interface ICaseTableToolShelfMenuListProps {
  setMenuIsOpen: (isOpen: boolean) => void
}

const CaseTableToolShelfMenuList = observer(
    function CaseTableToolShelfMenuList({ setMenuIsOpen }: ICaseTableToolShelfMenuListProps) {
  const document = appState.document
  const content = document.content
  const manager = getSharedModelManager(document)
  const datasets = manager?.getSharedModelsByType<typeof SharedDataSet>(kSharedDataSetType) ?? []
  const datasetNames = datasets.map(data => data.dataSet.name)
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [modalOpen, setModalOpen] = useState(false)
  const [dataSetIdToDeleteId, setDataSetIdToDelete] = useState("")

  if (!content) return null

  const handleCreateNewCaseTable = () => {
    let tile: Maybe<ITileModel>
    document.applyModelChange(() => {
      const baseName = t("DG.AppController.createDataSet.name")
      const newName = uniqueName(baseName, name => !datasetNames.includes(name), " ")
      const ds = DataSet.create({ name: newName, _title: newName })
      ds.addAttribute({ name: t("DG.AppController.createDataSet.initialAttribute") })
      // TODO: After beta release, turn animateCreation back on.
      // For some reason the viewport is scrolling to show new tables, and when animateCreation is on,
      // the new tile is created at 0,0. The correct fix for this issue is to prevent scrolling to show the new table.
      // const options: INewTileOptions = { animateCreation: true, markNewlyCreated: true }
      const options: INewTileOptions = { markNewlyCreated: true }
      tile = createDefaultTileOfType(kCaseTableTileType, options)
      if (!tile) return
      const { sharedData, sharedMetadata } = gDataBroker.addDataSet(ds, tile.id)
      // Add dataset to the formula manager
      getFormulaManager(document)?.addDataSet(ds)
      createTableOrCardForDataset(sharedData, sharedMetadata, kCaseTableTileType, options)
    }, {
      notify: [ dataContextCountChangedNotification, () => createTileNotification(tile) ],
      undoStringKey: "V3.Undo.caseTable.create",
      redoStringKey: "V3.Redo.caseTable.create",
      log: {message: "Create New Empty DataSet", args: {}, category: "document"}
    })
  }

  const handleOpenRemoveDataSetModal = (dsId: string) => {
    setModalOpen(true)
    onOpen()
    setDataSetIdToDelete(dsId)
    setMenuIsOpen(false)
  }
  return (
    <>
      <MenuList className="tool-shelf-menu-list table" data-testid="tool-shelf-table-menu-list">
        <MenuItem data-testid="tool-shelf-table-new" className="tool-shelf-menu-item"
            onClick={handleCreateNewCaseTable}>
          <TableIcon className="menu-icon case-table-icon"/>
          {t("DG.AppController.caseTableMenu.newDataSet")}
        </MenuItem>
        <MenuItem data-testid="tool-shelf-table-new-clipboard" isDisabled={true} className="tool-shelf-menu-item">
          <TableIcon className="menu-icon case-table-icon"/>
          {`${t("DG.AppController.caseTableMenu.clipboardDataset")}`}
          <Button className="menu-list-button" isDisabled={true}>🚧</Button>
        </MenuItem>
        {datasets.map((dataset) => {
          // case table title reflects DataSet title
          const tileTitle = dataset.dataSet.displayTitle
          return (
            // FIXME: this will create multiple undo entries
            <MenuItem key={`${dataset.dataSet.id}`} className="tool-shelf-menu-item"
              onClick={()=>createOrShowTableOrCardForDataset(dataset)} data-testid={`tool-shelf-table-${tileTitle}`}>
              <TableIcon className="menu-icon case-table-icon"/>
              {tileTitle}
              <Button className="menu-list-button tool-shelf-menu-trash">
                <TrashIcon className="menu-icon"
                    onClick={() => handleOpenRemoveDataSetModal(dataset.dataSet.id)} />
              </Button>

            </MenuItem>
          )
        })}
      </MenuList>
      {modalOpen &&
        <DeleteDataSetModal dataSetId={dataSetIdToDeleteId} isOpen={isOpen} onClose={onClose}
            setModalOpen={setModalOpen}/>
      }
    </>
  )
})

export const CaseTableToolShelfButton = () => {
  const [isOpen, setIsOpen] = useState(false)
  const onClose = () => setIsOpen(false)
  const onOpen = () => setIsOpen(true)
  const langClass = getSpecialLangFontClassName(gLocale.current)

  return (
    <Menu isLazy autoSelect={false} isOpen={isOpen} onOpen={onOpen} onClose={onClose}>
      <MenuButton className={clsx("tool-shelf-button", "tool-shelf-menu", "table", langClass, {"menu-open": isOpen})}
          title={`${t("DG.ToolButtonData.tableButton.toolTip")}`}
          data-testid={"tool-shelf-button-table"}>
        <TableIcon className="menu-icon case-table-icon" />
        <ToolShelfButtonTag className="tool-shelf-tool-label table" label={t("DG.ToolButtonData.tableButton.title")} />
      </MenuButton>
      <CaseTableToolShelfMenuList setMenuIsOpen={setIsOpen} />
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
    if (data) {
      document.applyModelChange(() => {
        manager?.removeSharedModel(dataSetId)
        getFormulaManager(document)?.removeDataSet(dataSetId)
      }, {
        notify: [dataContextCountChangedNotification, dataContextDeletedNotification(data)],
        undoStringKey: "V3.Undo.caseTable.delete",
        redoStringKey: "V3.Redo.caseTable.delete",
        log: logStringifiedObjectMessage("Delete dataset: %@",
                {id: dataSetId, name: data?.displayTitle}, "document")
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
