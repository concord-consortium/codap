import { TriangleDownIcon, TriangleUpIcon } from "@chakra-ui/icons"
import {Divider, Flex, List, ListItem,} from "@chakra-ui/react"
import React, { useRef } from "react"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { getGlobalValueManager, getSharedModelManager } from "../../models/tiles/tile-environment"
import { useFormulaEditorContext } from "./formula-editor-context"

import "./formula-insert-menus.scss"

const kMenuGap = 3
const kMaxHeight = 570

interface IProps {
  setShowValuesMenu: (show: boolean) => void
}

export const InsertValuesMenu = ({setShowValuesMenu}: IProps) => {
  const dataSet = useDataSetContext()
  const { editorApi } = useFormulaEditorContext()
  const collections = dataSet?.collections
  const attributeNamesInCollection = collections?.map(collection =>
    collection.attributes
      .map(attr => attr?.name)
      .filter(name => name !== undefined)
  )
  const attributeNames = dataSet?.attributes.map(attr => attr.name)
  const globalManager = dataSet && getGlobalValueManager(getSharedModelManager(dataSet))
  const globals = globalManager
                    ? Array.from(globalManager.globals.values()).map(global => ({ label: global.name }))
                    : []
  // TODO_Boundaries
  const remoteBoundaryData = [ "CR_Cantones", "CR_Provincias", "DE_state_boundaries",
     "IT_region_boundaries", "JP_Prefectures", "US_congressional_boundaries", "US_county_boundaries",
     "US_puma_boundaries", "US_state_boundaries", "country_boundaries" ]
  const constants = ["e", "false", "true", "π"]
  const scrollableContainerRef = useRef<HTMLUListElement>(null)
  let maxItemLength = 0

  const insertValueToFormula = (value: string) => {
    editorApi?.insertVariableString(value)
    setShowValuesMenu(false)
  }

  const getListContainerStyle = () => {
    // calculate the top of the list container based on the height of the list. The list should be
    // nearly centered on the button that opens it.
    // The list should not extend beyond the top or bottom of the window.
    const listEl = document.querySelector(".formula-operand-list-container") as HTMLElement
    const button = document.querySelector(".formula-editor-button.insert-value")

    attributeNames?.forEach((attrName) => {
      if (attrName.length > maxItemLength) {
        maxItemLength = attrName.length
      }
    })
    remoteBoundaryData.forEach((boundary) => {
      if (boundary.length > maxItemLength) {
        maxItemLength = boundary.length
      }
    })

    globals.forEach((global) => {
      if (global.label.length > maxItemLength) {
        maxItemLength = global.label.length
      }
    })

    let top = 0
    if (button && listEl) {
      const buttonRect = button.getBoundingClientRect()
      const buttonBottom = buttonRect.bottom || 0
      const listHeight = listEl.offsetHeight || 0
      const spaceBelow = window.innerHeight - buttonBottom

      if (spaceBelow >= listHeight) {
        top = buttonRect.height + kMenuGap
      } else {
        top = spaceBelow - listHeight
      }
      return { top, height: kMaxHeight, width: 40 + 10 * maxItemLength }
    }
  }

  const handleScroll = (direction: "up" | "down") => {
    const container = scrollableContainerRef.current
    if (container) {
      if (direction === "up") {
        container.scrollTo({ top: 0, behavior: "smooth" })
      } else {
        container.scrollTo({ top: container.scrollHeight, behavior: "smooth" })
      }
    }
  }

  return (
    <Flex className="formula-operand-list-container" data-testid="formula-value-list"
        style={getListContainerStyle()} >
      { scrollableContainerRef.current && scrollableContainerRef.current.scrollTop > 0 &&
      <div className="scroll-arrow" onPointerOver={()=>handleScroll("up")}>
        <TriangleUpIcon />
      </div>
      }
      <List className="formula-operand-scrollable-container"  ref={scrollableContainerRef}>
        <List className="formula-operand-list">
          { collections?.map((collection, index) => {
            return (
              <React.Fragment key={collection.id}>
                <List className="formula-operand-subset">
                  { attributeNamesInCollection?.[index]?.map((attrName) => {
                    return (
                      <ListItem className="formula-operand-list-item" key={attrName}
                          onClick={() => insertValueToFormula(attrName)} data-testid="formula-value-item">
                        {attrName}
                      </ListItem>
                    )
                  })}
                </List>
                <Divider className="list-divider"/>
              </React.Fragment>
            )
          })}
        </List>
        <List className="formula-operand-subset">
          <ListItem className="formula-operand-list-item" onClick={() => insertValueToFormula("caseIndex")}>
            caseIndex
          </ListItem>
        </List>
        <Divider className="list-divider"/>
        <List className="formula-operand-subset">
          { remoteBoundaryData.map((boundary) => {
            return (
              <ListItem key={boundary} className="formula-operand-list-item"
                    onClick={() => insertValueToFormula(boundary)}>
                {boundary}
              </ListItem>
            )
          })}
          { globals.map((global) => {
            return (
              <ListItem key={global.label} className="formula-operand-list-item"
                    onClick={() => insertValueToFormula(global.label)}>
                {global.label}
              </ListItem>
            )
          })}
        </List>
        <Divider className="list-divider"/>
        <List className="formula-operand-subset">
          {constants.map(constant => (
            <ListItem className="formula-operand-list-item" key={constant}
                      onClick={() => insertValueToFormula(constant)}>
              {constant}
            </ListItem>
          ))}
        </List>
      </List>
      { scrollableContainerRef.current &&
        (scrollableContainerRef.current.scrollHeight - scrollableContainerRef.current.scrollTop + 20 > kMaxHeight) &&
        <div className="scroll-arrow" onPointerOver={()=>handleScroll("down")}>
          <TriangleDownIcon />
        </div>
      }
    </Flex>
  )
}
