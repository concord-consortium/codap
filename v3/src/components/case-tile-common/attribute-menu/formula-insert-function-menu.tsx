import {Divider, Flex, List, ListItem,} from "@chakra-ui/react"
import React, { useState } from "react"

import functionStringMap from "../../../assets/json/function_strings.json"
import "./attribute-menu.scss"

interface IProps {
  formula: string
  setFormula: (formula: string) => void
  setShowFunctionMenu: (show: boolean) => void
}

export const InsertFunctionMenu = ({formula, setFormula, setShowFunctionMenu}: IProps) => {
  const [functionMenuView, setFunctionMenuView] = useState<"category" | "list" | "info" | undefined>("category")
  const [selectedCategory, setSelectedCategory] = useState("")
  const [selectedFunction, setSelectedFunction] = useState("")

  const insertFunctionToFormula = (func: any, args?: any) => {
    // insert the function to the formula
    const argsString = args.map((arg: any) => arg.name).join(", ") || ""
    setFormula(`${formula}${func}(${argsString})`)
    setFunctionMenuView(undefined)
    setShowFunctionMenu(false)
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
    const functionCategoryObj = functionStringMap.find((category) =>
      category.functions.some((func) => func.displayName === selectedFunction))
    const functionObj = functionCategoryObj?.functions.find(
      (func) => func.displayName === selectedFunction)
    return (
      <Flex className="formula-function-list">
        <Flex className="functions-list-header" flexDir="row"
              onClick={handleShowFunctionCategoryList}>
          <span className="function-select-back-arrow">&lt; </span>
          <span className="function-categories-header">{`${functionCategoryObj?.displayName} Functions`}</span>
          <span className="function-selected-item-name-header">{`${functionObj?.displayName}`}</span>
        </Flex>
        <Divider className="function-header-divider"/>
        <Flex className="function-info-body" flexDir="column">
          <div className="function-info-name"
                onClick={()=>insertFunctionToFormula(functionObj?.displayName, functionObj?.args)}>
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
    const categoryObj = functionStringMap.find((categoryItem) => categoryItem.category === selectedCategory)
    return (
      <Flex flexDir={"column"} className="formula-function-list">
        <Flex className="functions-list-header" alignItems="center" flexDir={"row"}
              onClick={handleShowFunctionCategoryMenu} >
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
              >
                <span className="function-menu-name" onClick={()=>insertFunctionToFormula(func.displayName, func.args)}>
                  {func.displayName}
                    (<span className="function-arguments">{func.args.map((arg) => arg.name).join(", ")}</span>)
                </span>
                <span className="function-info-button" data-testid="function-info-button"
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
      <List className="formula-function-list">
        {functionStringMap.map((category) => {
          return (
            <ListItem key={category.category} className="function-category-list-item"
                      onClick={(event)=>handleShowFunctionCategoryList(event, category.category)}>
              <span>{`${category.displayName} Functions`}</span>
              <span className="function-category-expand-arrow">&gt;</span>
            </ListItem>
          )
        })}
      </List>
    )
  }

  return (
    <Flex className="formula-function-menu-container">
      { functionMenuView === "info"
          ? renderFunctionInfo()
          : functionMenuView === "list"
            ? renderFunctionList()
            : functionMenuView === "category" ? renderFunctionCategoryList() : null}
    </Flex>
  )
}
