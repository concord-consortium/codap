import { Menu, MenuItem, MenuList, MenuButton, MenuDivider } from "@chakra-ui/react"
import React, { CSSProperties, memo } from "react"
import { useDataSetContext } from "../../../hooks/use-data-set-context"
import { GraphPlace } from "../../graph/graphing-types"
import { useGraphLayoutContext} from "../../graph/models/graph-layout"
import t from "../../../utilities/translation/translate"
import { useOverlayBounds } from "../../../hooks/use-overlay-bounds"
import { useDataConfigurationContext } from "../../graph/hooks/use-data-configuration-context"

interface IProps {
  place: GraphPlace,
  target: SVGGElement | null
  portal: HTMLElement | null
  onChangeAttribute: (place: GraphPlace, attrId: string) => void
  onTreatAttributeAs: (place: GraphPlace, attrId: string, treatAs: string) => void
}

const _AxisAttributeMenu = ({ place, target, portal, onChangeAttribute, onTreatAttributeAs }: IProps ) => {
  const data = useDataSetContext()
  const dataConfig = useDataConfigurationContext()
  const { plotWidth, plotHeight } = useGraphLayoutContext()
  const role = place === "left" ? "y" : "x"
  const attrId = dataConfig?.attributeID(role)
  const attribute = attrId ? data?.attrFromID(attrId) : null
  const treatAs = dataConfig?.attributeType(role) === "numeric" ? "categorical" : "numeric"
  const overlayBounds = useOverlayBounds({target, portal})
  const buttonStyles: CSSProperties = { position: "absolute", color: "transparent" }

  if (!attrId && place === "bottom"){
    buttonStyles.top = plotHeight + 4
    buttonStyles.left = ( plotWidth * .5 ) - 8 // ~ width of y scale
  }

  return (
    <div className="axis-attribute-menu">
      <Menu>
        <MenuButton style={{ ...overlayBounds, ...buttonStyles }}>{attribute?.name}</MenuButton>
        <MenuList>
          { data?.attributes?.map((attr) => {
            return (
              <MenuItem onClick={() => onChangeAttribute(place, attr.id)} key={attr.id}>
                {attr.name}
              </MenuItem>
            )
          })}
          { attribute &&
            <>
              <MenuDivider />
              <MenuItem onClick={() => onChangeAttribute(place, "")}>
                { place === "left" &&
                  t("DG.DataDisplayMenu.removeAttribute_y", {vars: [attribute?.name]})
                }
                { place === "bottom" &&
                  t("DG.DataDisplayMenu.removeAttribute_x", {vars: [attribute?.name]})
                }
              </MenuItem>
              <MenuItem onClick={() => onTreatAttributeAs(place, attribute?.id, treatAs)}>
                {treatAs === "categorical" && t("DG.DataDisplayMenu.treatAsCategorical")}
                {treatAs === "numeric" && t("DG.DataDisplayMenu.treatAsNumeric")}
              </MenuItem>
            </>
          }
        </MenuList>
      </Menu>
    </div>
  )
}

export const AxisAttributeMenu = memo(_AxisAttributeMenu)
