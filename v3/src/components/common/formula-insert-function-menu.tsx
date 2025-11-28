import {Divider, Flex, List, ListItem,} from "@chakra-ui/react"
import React, { useEffect, useRef, useState } from "react"

import { functionCategoryInfoArray, FunctionInfo } from "../../lib/functions"
import { useFormulaEditorContext } from "./formula-editor-context"

import "./formula-insert-menus.scss"

const kMenuGap = 3

interface IProps {
  setShowFunctionMenu: (show: boolean) => void
}

export const InsertFunctionMenu = ({setShowFunctionMenu}: IProps) => {
  const { editorApi } = useFormulaEditorContext()
  const [functionMenuView, setFunctionMenuView] = useState<"category" | "list" | "info" | undefined>("category")
  const [selectedCategory, setSelectedCategory] = useState("")
  const [selectedFunction, setSelectedFunction] = useState("")
  const [menuPosition, setMenuPosition] = useState({})
  const containerRef = useRef<HTMLDivElement>(null)

  const getFunctionMenuPosition = () => {
    const menuEl = containerRef.current
    const buttonEl = document.querySelector(".formula-editor-button.insert-value")
    const viewableTop = window.scrollY
    let menuTopPosition = 0

    if (menuEl && buttonEl) {
      const buttonRect = buttonEl.getBoundingClientRect()
      let menuElHeight = menuEl.offsetHeight || 0
      //get space available above and below the button
      const spaceBelow = window.innerHeight - buttonRect.bottom
      const spaceAbove = buttonRect.top
      if (spaceBelow >= menuElHeight) {
        menuTopPosition = buttonRect.height + kMenuGap
      } else if (spaceAbove >= menuElHeight) {
        menuTopPosition = -(menuElHeight + kMenuGap)
      } else {
        menuTopPosition = spaceBelow > spaceAbove
          ? 0 + kMenuGap
          : viewableTop || -(menuElHeight + kMenuGap)
        menuElHeight = spaceBelow > spaceAbove ? spaceBelow : spaceAbove
      }
      return { top: menuTopPosition, height: menuElHeight }
    }
    return {}
  }

  useEffect(() => {
    setMenuPosition(getFunctionMenuPosition())
    // focus the menu on mount so it gets key events
    containerRef.current?.focus()
  }, [])

  const insertFunctionString = (functionInfo?: FunctionInfo) => {
    const { displayName = "", args = [] } = functionInfo || {}
    // insert the function to the formula st the cursor position or selection
    const argsString = args.map(arg => arg.name).join(", ") || ""
    const functionStr = `${displayName}(${argsString})`
    editorApi?.insertFunctionString(functionStr)
    setFunctionMenuView(undefined)
    setShowFunctionMenu(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" || e.key === "Tab") {
      setFunctionMenuView(undefined)
      setShowFunctionMenu(false)
      e.preventDefault()
      e.stopPropagation()
    }
  }

  const handleShowFunctionCategoryList = (e: React.MouseEvent, categoryName?: string) => {
    e.stopPropagation()
    setFunctionMenuView("list")
    categoryName && setSelectedCategory(categoryName)
  }

  const handleShowFunctionInfo = (funcName: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setFunctionMenuView("info")
    setSelectedFunction(funcName)
  }

  const handleShowFunctionCategoryMenu = (e: React.MouseEvent) => {
    e.stopPropagation()
    setFunctionMenuView("category")
  }

  const renderFunctionInfo = () => {
    const functionCategoryObj = functionCategoryInfoArray.find((category) =>
      category.functions.some((func) => func.displayName === selectedFunction))
    const functionObj = functionCategoryObj?.functions.find(
      (func) => func.displayName === selectedFunction)
    return (
      <Flex className="formula-function-list" data-testid="formula-function-info">
        <Flex className="functions-list-header" flexDir="row" data-testid="formula-function-info-header"
              onClick={handleShowFunctionCategoryList}>
          <span className="function-select-back-arrow">&lt; </span>
          <span className="function-categories-header">{`${functionCategoryObj?.displayName} Functions`}</span>
          <span className="function-selected-item-name-header">{`${functionObj?.displayName}`}</span>
        </Flex>
        <Divider className="function-header-divider"/>
        <Flex className="function-info-body" flexDir="column">
          <div className="function-info-name" data-testid="function-info-name"
                onClick={() => insertFunctionString(functionObj)}>
            <span>
              {functionObj?.displayName}
              (<span className="function-arguments">{functionObj?.args.map((arg) => arg.name).join(", ")}</span>)
            </span>
          </div>
          <div>{functionObj?.description}</div>
          <div className="function-info-subtitle">Parameters</div>
          {functionObj?.args.map((arg) => {
            return (
              <div className="function-arguments-info" key={arg.name}>
                <span>{arg.name}:</span>
                <span>{arg.description}</span>
                <span className="function-arguments">{arg.optional ? "(optional)" : "(required)"}</span>
              </div>
            )
          })}
          <div className="function-info-subtitle">Examples</div>
          {functionObj?.examples.map((example) => {
            return (
              <div key={example}>
                <span>{example}</span>
              </div>
            )
          })}
        </Flex>
      </Flex>
    )
  }

  const renderFunctionList = () => {
    const categoryObj = functionCategoryInfoArray.find((categoryItem) => categoryItem.category === selectedCategory)
    return (
      <Flex flexDir={"column"} className="formula-function-list" data-testid="formula-function-list">
        <Flex className="functions-list-header" alignItems="center" flexDir={"row"}
              onClick={handleShowFunctionCategoryMenu} data-testid="formula-function-list-header">
          <span className="function-select-back-arrow">&lt; </span>
          <span>Categories</span>
          <span className="function-selected-item-name-header">{`${categoryObj?.displayName} Functions`}</span>
        </Flex>
        <Divider className="function-header-divider"/>
        <Flex flexDir={"column"}>
          {categoryObj?.functions.map((func) => {
            return (
              <Flex
                key={`function-${func.displayName}`}
                flexDir="row"
                alignItems="center"
                justifyContent="space-between"
                w="100%"
                className="function-menu-item"
                onClick={() => insertFunctionString(func)}
                data-testid="function-menu-item"
              >
                <span className="function-menu-name">
                  {func.displayName}
                    (<span className="function-arguments">{func.args.map((arg) => arg.name).join(", ")}</span>)
                </span>
                <span className="function-info-button" data-testid={`function-info-button-${func.displayName}`}
                  onClick={(event)=>handleShowFunctionInfo(func.displayName, event)}>
                  ⓘ
                </span>
              </Flex>
            )
          })}
        </Flex>
      </Flex>
    )
  }

  const renderFunctionCategoryList = () => {
    return (
      <List className="formula-function-list" data-testid="formula-function-category-list">
        {functionCategoryInfoArray.map((category) => {
          return (
            <ListItem key={category.category} className="function-category-list-item"
                      onClick={(event)=>handleShowFunctionCategoryList(event, category.category)}
                      data-testid={`formula-function-category-item`}>
              <span>{`${category.displayName} Functions`}</span>
              <span className="function-category-expand-arrow">&gt;</span>
            </ListItem>
          )
        })}
      </List>
    )
  }

  return (
    <Flex ref={containerRef} className="formula-function-menu-container" style={menuPosition} tabIndex={-1}
          onKeyDown={handleKeyDown}>
      { functionMenuView === "info"
          ? renderFunctionInfo()
          : functionMenuView === "list"
            ? renderFunctionList()
            : functionMenuView === "category" ? renderFunctionCategoryList() : null}
    </Flex>
  )
}
