import React from "react"
import { Menu, MenuButton, MenuItem, MenuList, Tag} from "@chakra-ui/react"
import { observer } from "mobx-react-lite"
import t from "../../utilities/translation/translate"
import { getSharedModelManager } from "../../models/tiles/tile-environment"
import { appState } from "../../models/app-state"
import { kSharedDataSetType, SharedDataSet } from "../../models/shared/shared-data-set"
import { DataSet, toCanonical } from "../../models/data/data-set"
import { gDataBroker } from "../../models/data/data-broker"
import TableIcon from "../../assets/icons/icon-table.svg"
import TrashIcon from "../../assets/icons/icon-trash.svg"

import "../tool-shelf/tool-shelf.scss"

export const CaseTableToolShelfMenuList = observer(function CaseTableToolShelfMenuList() {
  const document = appState.document
  const manager = getSharedModelManager(document)
  const datasets = manager?.getSharedModelsByType<typeof SharedDataSet>(kSharedDataSetType)

  const handleCreateNewDataSet = () => {
    const newData = [{AttributeName: ""}]
    const ds = DataSet.create({name: "New Dataset"})
    ds.addAttribute({name: "AttributeName"})
    ds.addCases(toCanonical(ds, newData))
    gDataBroker.addDataSet(ds)
  }
  
  return (
    <MenuList>
      {datasets?.map(ds => {
        const dataSetName = ds.dataSet.name
        return (
          <MenuItem key={dataSetName}>{dataSetName}
            <TrashIcon className="tool-shelf-menu-trash-icon"/>
          </MenuItem>
        )
      })}
      <MenuItem>{t("DG.AppController.caseTableMenu.clipboardDataset")}</MenuItem>
      <MenuItem onClick={handleCreateNewDataSet}>{t("DG.AppController.caseTableMenu.newDataSet")}</MenuItem>
    </MenuList>
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
