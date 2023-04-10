import React from "react"
import { Menu, MenuButton, MenuItem, MenuList, Tag} from "@chakra-ui/react"
import t from "../../utilities/translation/translate"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import TableIcon from "../../assets/icons/icon-table.svg"
import TrashIcon from "../../assets/icons/icon-trash.svg"

import "../tool-shelf/tool-shelf.scss"

export const CaseTableToolShelfButton = () => {
  const data = useDataSetContext()

  return (
    <Menu isLazy>
      <MenuButton className="tool-shelf-button menu table" title={`${t("DG.ToolButtonData.tableButton.toolTip")}`}
          data-testid={"tool-shelf-button-table"}>
        <TableIcon />
        <Tag className='tool-shelf-tool-label table'>{t("DG.ToolButtonData.tableButton.title")}</Tag>
      </MenuButton>
      <MenuList>
        <MenuItem>{data?.name}
          <TrashIcon className="tool-shelf-menu-trash-icon"/>
        </MenuItem>
        <MenuItem>{t("DG.AppController.caseTableMenu.clipboardDataset")}</MenuItem>
        <MenuItem>{t("DG.AppController.caseTableMenu.newDataSet")}</MenuItem>
      </MenuList>
    </Menu>
  )
}
