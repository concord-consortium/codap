import { MenuItem, MenuList } from "@chakra-ui/react"
import { observer } from "mobx-react-lite"
import { If } from "../common/if"
import { useMenuItemScrollIntoView } from "../../hooks/use-menu-item-scroll-into-view"
import { t } from "../../utilities/translation/translate"

export interface IMenuItem {
  itemKey: string
  // defaults to t(itemKey) if not implemented
  itemLabel?: (item: IMenuItem) => string
  // defaults to true if not implemented
  isEnabled?: (item: IMenuItem) => boolean
  handleClick?: (item: IMenuItem) => void
  dataTestId?: string
}

interface IProps {
  menuItems: IMenuItem[]
}

export const StdMenuList = observer(function StdMenuList({ menuItems, ...others }: IProps) {
  const handleFocus = useMenuItemScrollIntoView()
  return (
    <MenuList onFocus={handleFocus} {...others}>
      {
        menuItems.map(item => {
          const isDisabled = !item.handleClick || (item.isEnabled && !item.isEnabled(item))
          const itemLabel = item.itemLabel?.(item) || t(item.itemKey)
          return (
            <MenuItem
              key={item.itemKey}
              isDisabled={isDisabled}
              onClick={() => item.handleClick?.(item)}
              data-testid={item.dataTestId}
            >
              {itemLabel}
              <If condition={!item.handleClick}><span aria-hidden="true"> 🚧</span></If>
            </MenuItem>
          )
        })
      }
    </MenuList>
  )
})
