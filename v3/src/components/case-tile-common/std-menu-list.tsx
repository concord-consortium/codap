import { observer } from "mobx-react-lite"
import { MenuItem } from "react-aria-components"
import { If } from "../common/if"
import { InspectorMenuContent } from "../inspector-panel"
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
  return (
    <InspectorMenuContent {...others}>
      {
        menuItems.map(item => {
          const isDisabled = !item.handleClick || (item.isEnabled && !item.isEnabled(item))
          const itemLabel = item.itemLabel?.(item) || t(item.itemKey)
          return (
            <MenuItem
              key={item.itemKey}
              id={item.itemKey}
              isDisabled={isDisabled}
              onAction={() => item.handleClick?.(item)}
              data-testid={item.dataTestId}
            >
              {itemLabel}
              <If condition={!item.handleClick}><span aria-hidden="true"> 🚧</span></If>
            </MenuItem>
          )
        })
      }
    </InspectorMenuContent>
  )
})
