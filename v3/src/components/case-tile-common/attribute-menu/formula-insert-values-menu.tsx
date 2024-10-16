import {Divider, Flex, List, ListItem,} from "@chakra-ui/react"
import React, { useRef } from "react"
import { useDataSetContext } from "../../../hooks/use-data-set-context"
import { TriangleDownIcon, TriangleUpIcon } from "@chakra-ui/icons"
import { getGlobalValueManager, getSharedModelManager } from "../../../models/tiles/tile-environment"

import "./attribute-menu.scss"

const kMenuGap = 3
const kMaxHeight = 570

interface IProps {
  formula: string
  cursorPosition: number,
  editorSelection: {from: number, to: number},
  setFormula: (formula: string) => void
  setShowValuesMenu: (show: boolean) => void
}

export const InsertValuesMenu = ({formula, cursorPosition, editorSelection,
      setFormula, setShowValuesMenu}: IProps) => {
  const dataSet = useDataSetContext()
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
  const remoteBoundaryData = [ "CR_Cantones", "CR_Provincias", "DE_state_boundaries",
     "IT_region_boundaries", "JP_Prefectures", "US_congressional_boundaries", "US_county_boundaries",
     "US_puma_boundaries", "US_state_boundaries", "country_boundaries" ]
  const scrollableContainerRef = useRef<HTMLUListElement>(null)
  let maxItemLength = 0

  const insertValueToFormula = (value: string) => {
    // insert operand into the formula at either cursor position or selected range
    const from = editorSelection.from
    const to = editorSelection.to

    if (from != null && to != null) {
      const formulaStart = formula.slice(0, from)
      const formulaEnd = formula.slice(to)
      setFormula(`${formulaStart}${value}${formulaEnd}`)
    } else if (cursorPosition != null) {
      const formulaStart = formula.slice(0, cursorPosition)
      const formulaEnd = formula.slice(cursorPosition)
      setFormula(`${formulaStart}${value}${formulaEnd}`)
    }
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
    <Flex className="formula-operand-list-container"
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
                                onClick={() => insertValueToFormula(attrName)}>
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
                    onClick={() => insertValueToFormula("caseIndex")}>
                {global.label}
              </ListItem>
            )
          })}
        </List>
        <Divider className="list-divider"/>
        <List className="formula-operand-subset">
          <ListItem className="formula-operand-list-item" onClick={() => insertValueToFormula("e")}>
            e
          </ListItem>
          <ListItem className="formula-operand-list-item" onClick={() => insertValueToFormula("false")}>
            false
          </ListItem>
          <ListItem className="formula-operand-list-item" onClick={() => insertValueToFormula("true")}>
            true
          </ListItem>
          <ListItem className="formula-operand-list-item" onClick={() => insertValueToFormula("π")}>
            π
          </ListItem>
        </List>
      </List>
      { scrollableContainerRef.current && (scrollableContainerRef.current.scrollHeight - scrollableContainerRef.current.scrollTop + 20 > kMaxHeight) &&
        <div className="scroll-arrow" onPointerOver={()=>handleScroll("down")}>
          <TriangleDownIcon />
        </div>
      }
    </Flex>
  )
}
