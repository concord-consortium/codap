import { TriangleDownIcon, TriangleUpIcon } from "@chakra-ui/icons"
import {Divider, Flex, List, ListItem,} from "@chakra-ui/react"
import { IAnyStateTreeNode } from "mobx-state-tree"
import React, { useEffect, useRef, useState } from "react"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { boundaryManager } from "../../models/boundaries/boundary-manager"
import { getSharedModelManager } from "../../models/tiles/tile-environment"
import { getGlobalValueManager } from "../../models/global/global-value-manager"
import { useFormulaEditorContext } from "./formula-editor-context"

import "./formula-insert-menus.scss"

const kMenuGap = 3
const kMaxHeight = 470

interface IProps {
  setShowValuesMenu: (show: boolean) => void
}

function getGlobalsNames(node?: IAnyStateTreeNode) {
  const globalManager = node && getGlobalValueManager(getSharedModelManager(node))
  return globalManager ? Array.from(globalManager.globals.values()).map(global => global.name) : []
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
  const constants = ["e", "false", "true", "π"]
  const scrollableContainerRef = useRef<HTMLUListElement>(null)
  const [, setScrollPosition] = useState(0)

  const maxItemLength = useRef(0)

  const insertValueToFormula = (value: string) => {
    // if the name begins with a digit or has any non-alphanumeric chars, wrap it in backticks
    if (/^\d|[^\w]/.test(value)) value = `\`${value}\``
    editorApi?.insertVariableString(value)
    setShowValuesMenu(false)
  }

  function getListContainerStyle() {
    // calculate the top of the list container based on the height of the list. The list should be
    // nearly centered on the button that opens it.
    // The list should not extend beyond the top or bottom of the window.
    const listEl = document.querySelector(".formula-operand-list-container") as HTMLElement
    const button = document.querySelector(".formula-editor-button.insert-value")

    attributeNames?.forEach((attrName) => {
      if (attrName.length > maxItemLength.current) {
        maxItemLength.current = attrName.length
      }
    })
    boundaryManager.boundaryKeys.forEach((boundary) => {
      if (boundary.length > maxItemLength.current) {
        maxItemLength.current = boundary.length
      }
    })

    getGlobalsNames(dataSet).forEach(globalName => {
      if (globalName.length > maxItemLength.current) {
        maxItemLength.current = globalName.length
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
      return { top, height: kMaxHeight, width: 40 + 10 * maxItemLength.current }
    }
    return {}
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

  useEffect(() => {
    const handleScrollPosition = () => {
      if (scrollableContainerRef.current) {
        setScrollPosition(scrollableContainerRef.current.scrollTop)
      }
    }

    const container = scrollableContainerRef.current
    container?.addEventListener("scroll", handleScrollPosition)

    return () => {
      container?.removeEventListener("scroll", handleScrollPosition)
    }
  }, [])

  const isScrollable = scrollableContainerRef.current && scrollableContainerRef.current.scrollHeight > kMaxHeight
  const canScrollUp = scrollableContainerRef.current && scrollableContainerRef.current.scrollTop > 0
  const canScrollDown = scrollableContainerRef.current &&
          (scrollableContainerRef.current.scrollHeight - scrollableContainerRef.current.scrollTop + 20 > kMaxHeight)

  return (
    <Flex className="formula-operand-list-container" data-testid="formula-value-list"
        style={getListContainerStyle()} >
      { isScrollable && canScrollUp &&
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
          { boundaryManager.boundaryKeys.map((boundary) => {
            return (
              <ListItem key={boundary} className="formula-operand-list-item"
                    onClick={() => insertValueToFormula(boundary)}>
                {boundary}
              </ListItem>
            )
          })}
          { getGlobalsNames(dataSet).map(globalName => {
            return (
              <ListItem key={globalName} className="formula-operand-list-item"
                    onClick={() => insertValueToFormula(globalName)}>
                {globalName}
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
      { isScrollable && canScrollDown &&
        <div className="scroll-arrow" onPointerOver={()=>handleScroll("down")}>
          <TriangleDownIcon />
        </div>
      }
    </Flex>
  )
}
