import { Menu, MenuItem, MenuList, MenuButton, MenuDivider, useToast } from "@chakra-ui/react"
import React, { CSSProperties } from "react"
import { useDataSetContext } from "../../../hooks/use-data-set-context"
import { GraphPlace, graphPlaceToAttrPlace } from "../models/axis-model"
import { IGraphModel } from "../models/graph-model"
import { useGraphLayoutContext } from "../models/graph-layout"
import { measureText } from "../../../hooks/use-measure-text"
import { GraphController } from "../models/graph-controller"
// import { usePlotResponders } from "../hooks/graph-hooks"

import "./axis-attribute-menu"

interface IProps {
  attrId: string
  place: GraphPlace,
  onChangeAttribute: (place: string, attrid: string) => void
}

export const AxisAttributeMenu = ({ attrId, place, onChangeAttribute }: IProps ) => {
  const data = useDataSetContext()
  const attribute = data?.attrFromID(attrId)
  const attrList = data?.attributes.map(attr => {
    return { name: attr.name, id: attr.id }
  })
  const treatAs = attribute?.type === "numeric" ? "categorical" : "numeric"
  const layout = useGraphLayoutContext()
  const textLength = measureText(attribute?.name as string)
  const toast = useToast()

  // const handleSelectAttribute = (newAttrId: string) => {
  //   console.log(`selected ${newAttrId}`)
  //   // TODO - accomplish this without bringing in the graphModel
  //   //graphModel.setAttributeID(graphPlaceToAttrPlace(place), newAttrId)

  // }

  const handleRemoveAttribute = () => {
    toast({
      title: `Remove attribute`,
      description: `remove ${attribute?.name} from ${place}`,
      status: 'success', duration: 5000, isClosable: true,
    })
    // TODO - make this actually happen
  }

  const handleTreatAs = () => {
    toast({
      title: `Treat attribute as`,
      description:`treat ${attribute?.name} as ${treatAs}`,
      status: 'success', duration: 5000, isClosable: true,
    })
  }

  // Position chakra menu button over existing axis title
  const { margin, graphHeight, graphWidth, plotHeight, plotWidth } = layout
  console.log({ graphHeight, graphWidth, plotHeight, plotWidth });
  console.log(margin.left, margin.right)

  // TODO, recalculate based on actual axis width
  const determineMenuButtonLeft = () => {
    if (place === "left"){
      return layout.margin.left * -.5
    }

    else {
      return .5 * layout.plotWidth - (-.2 * layout.margin.left)
    }
  }

  const menuButtonStyles: CSSProperties = {
    position: "absolute",
    color: "transparent",
    rotate: place === "left" ? "270deg" : "0deg",
    top: place === "left" ? (.5 * layout.plotHeight) - (.2 * textLength) : layout.plotHeight + 20,
    left: determineMenuButtonLeft(),
    opacity:.2,
    background: "blue"
  }

  return (
    <div className="axis-attribute-menu">
      <Menu>
        <MenuButton style={menuButtonStyles}>{attribute?.name}</MenuButton>
        <MenuList>
          { attrList?.map((attr) => {
            return (
              <MenuItem onClick={() => onChangeAttribute(place, attr.id)} key={attr.id}>
                {attr.name}
              </MenuItem>
            )
          })}
          <MenuDivider />
          <MenuItem onClick={() => onChangeAttribute(place, "")}>Remove {attribute?.name}</MenuItem>
          <MenuItem onClick={() => handleTreatAs()}>Treat as {treatAs}</MenuItem>
        </MenuList>
      </Menu>
    </div>
  )
}
