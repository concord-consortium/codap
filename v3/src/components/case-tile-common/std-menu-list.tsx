import { MenuItem, MenuList } from "@chakra-ui/react"
import { observer } from "mobx-react-lite"
import React from "react"
import { t } from "../../utilities/translation/translate"

export interface IMenuItem {
  itemKey: string
  // defaults to t(itemKey) if not implemented
  itemLabel?: (item: IMenuItem) => string
  // defaults to true if not implemented
  isEnabled?: (item: IMenuItem) => boolean
  handleClick?: (item: IMenuItem) => void
}

interface IProps {
  menuItems: IMenuItem[]
}

export const StdMenuList = observer(function StdMenuList({ menuItems, ...others }: IProps) {
  return (
    <MenuList {...others}>
      {
        menuItems.map(item => {
          const isDisabled = !item.handleClick || (item.isEnabled && !item.isEnabled(item))
          const itemLabel = item.itemLabel?.(item) || t(item.itemKey)
          return (
            <MenuItem key={item.itemKey} isDisabled={isDisabled} onClick={() => item.handleClick?.(item)}>
              {`${itemLabel}${item.handleClick ? "" : " 🚧"}`}
            </MenuItem>
          )
        })
      }
    </MenuList>
  )
})
