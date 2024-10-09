import {
  Box, Button, Divider, Flex, FormControl, FormLabel, Input, List, ListItem,
  ModalBody, ModalCloseButton, ModalFooter, ModalHeader, Textarea, Tooltip
} from "@chakra-ui/react"
import React, { useEffect, useState } from "react"
import { observer } from "mobx-react-lite"
import { useDataSetContext } from "../../../hooks/use-data-set-context"
import { logStringifiedObjectMessage } from "../../../lib/log-message"
import { updateAttributesNotification, updateCasesNotification } from "../../../models/data/data-set-notifications"
import { t } from "../../../utilities/translation/translate"
import { CodapModal } from "../../codap-modal"

import functionStringMap from "../../../assets/json/function_strings.json"
import "./attribute-menu.scss"

interface IProps {
  attributeId: string
  isOpen: boolean
  onClose: () => void
}

export const EditFormulaModal = observer(function EditFormulaModal({ attributeId, isOpen, onClose }: IProps) {
  const dataSet = useDataSetContext()
  const attribute = dataSet?.attrFromID(attributeId)
  const [formula, setFormula] = useState("")
  const [showOperandMenu, setShowOperandMenu] = useState(false)
  const [functionMenuView, setFunctionMenuView] = useState<"category" | "list" | "info" | undefined>("category")
  const [showFunctionMenu, setShowFunctionMenu] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState("")
  const [selectedFunction, setSelectedFunction] = useState("")

  useEffect(() => {
    setFormula(attribute?.formula?.display || "")
  }, [attribute?.formula?.display])

  const applyFormula = () => {
    if (attribute) {
      dataSet?.applyModelChange(() => {
        attribute.setDisplayExpression(formula)
      }, {
        // TODO Should also broadcast notify component edit formula notification
        notify: [
          updateCasesNotification(dataSet),
          updateAttributesNotification([attribute], dataSet)
        ],
        undoStringKey: "DG.Undo.caseTable.editAttributeFormula",
        redoStringKey: "DG.Redo.caseTable.editAttributeFormula",
        log: logStringifiedObjectMessage("Edit attribute formula: %@",
              {name: attribute.name, collection: dataSet?.getCollectionForAttribute(attributeId)?.name, formula},
              "data")
      })
    }
    closeModal()
  }

  const closeModal = () => {
    setFunctionMenuView(undefined)
    setShowOperandMenu(false)
    setShowFunctionMenu(false)
    onClose()
  }

  const handleModalWhitspaceClick = (e: React.MouseEvent<HTMLDivElement>) => {
    console.log("handleModalWhitspaceClick clicked")
    e.preventDefault()
    setShowOperandMenu(false)
    setFunctionMenuView(undefined)
    setShowFunctionMenu(false)
  }
  const handleFormulaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => setFormula(e.target.value)

  const handleInsertValuesOpen = () => {
    setShowOperandMenu(true)
    setFunctionMenuView(undefined)
    setShowFunctionMenu(false)
  }

  const handleInsertFunctionsOpen = () => {
    setShowFunctionMenu(true)
    setFunctionMenuView("category")
    setShowOperandMenu(false)
  }

  const insertOperandToFormula = (operand: string) => {
    console.log("insertOperandToFormula clicked")
    // insert the function to the formula
    setFormula(formula + operand)
    setShowOperandMenu(false)
  }

  const renderOperandMenu = () => {
    const attributeNames = dataSet?.attributes.map(attr => attr.name)
    if (showOperandMenu) {
      return (
        <Flex className="formula-operand-list-container" style={{ top: 0, left: 0 }}>
          <List className="formula-operand-list">
            {attributeNames?.map((attrName) => {
              return (
                <ListItem className="formula-operand-list-item" key={attrName}
                          onClick={() => insertOperandToFormula(attrName)}>
                  {attrName}
                </ListItem>
              )
            })}
          </List>
          <Divider color={"#A0A0A0"}/>
          <List>
            <ListItem className="formula-operand-list-item" onClick={() => insertOperandToFormula("caseIndex")}>
              caseIndex
            </ListItem>
          </List>
          <Divider color={"#A0A0A0"}/>
          <List>
            <ListItem className="formula-operand-list-item" onClick={() => insertOperandToFormula("e")}>
              e
            </ListItem>
            <ListItem className="formula-operand-list-item" onClick={() => insertOperandToFormula("false")}>
              false
            </ListItem>
            <ListItem className="formula-operand-list-item" onClick={() => insertOperandToFormula("true")}>
              true
            </ListItem>
            <ListItem className="formula-operand-list-item" onClick={() => insertOperandToFormula("π")}>
              π
            </ListItem>
          </List>
        </Flex>
      )
    }
  }

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
      console.log("in renderFunctionInfo functionObj: ", functionObj)
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
    console.log("in renderFunctionList categoryObj", categoryObj)
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
          console.log("category: ", category)
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

  const renderFunctionMenu = () => {
    console.log("functionMenuView: ", functionMenuView)
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

  const footerButtons = [{
    label: t("DG.AttrFormView.cancelBtnTitle"),
    tooltip: t("DG.AttrFormView.cancelBtnTooltip"),
    onClick: closeModal
  }, {
    label: t("DG.AttrFormView.applyBtnTitle"),
    onClick: applyFormula,
    default: true
  }]

  return (
    <CodapModal
      isOpen={isOpen}
      onClose={onClose}
      modalWidth={"400px"}
      modalHeight={"180px"}
    >
      <ModalHeader h="30" className="codap-modal-header" fontSize="md" data-testid="codap-modal-header">
        <div className="codap-modal-icon-container" />
        <div className="codap-header-title" />
        <ModalCloseButton onClick={onClose} data-testid="modal-close-button" />
      </ModalHeader>
      <ModalBody onClick={() => handleModalWhitspaceClick}>
        <FormControl display="flex" flexDirection="column" className="formula-form-control">
          <FormLabel display="flex" flexDirection="row">{t("DG.AttrFormView.attrNamePrompt")}
            <Input
              size="xs" ml={5} placeholder="attribute" value={attribute?.name} data-testid="attr-name-input" disabled
            />
          </FormLabel>
          <FormLabel>{t("DG.AttrFormView.formulaPrompt")}
            <Textarea size="xs" value={formula} onChange={handleFormulaChange}
              onKeyDown={(e) => e.stopPropagation()} data-testid="attr-formula-input" />
          </FormLabel>
        </FormControl>
        <Flex flexDirection="row" justifyContent="flex-start">
          <Box position="relative">
            <Button className="formula-editor-button insert-value" size="xs" ml="5"
                    onClick={handleInsertValuesOpen}>
              {t("DG.AttrFormView.operandMenuTitle")}
            </Button>
            {showOperandMenu && renderOperandMenu()}
          </Box>
          <Box position="relative">
            <Button className="formula-editor-button insert-function" size="xs" ml="5"
                    onClick={handleInsertFunctionsOpen}>
              {t("DG.AttrFormView.functionMenuTitle")}
            </Button>
            {showFunctionMenu && renderFunctionMenu()}
          </Box>
        </Flex>
      </ModalBody>
      <ModalFooter mt="-5">
        {
          footerButtons.map((b, idx) => {
            const key = `${idx}-${b.label}`
            return (
              <Tooltip key={idx} label={b.tooltip} h="20px" fontSize="12px" color="white" openDelay={1000}
                placement="bottom" bottom="15px" left="15px" data-testid="modal-tooltip"
              >
                <Button key={key} size="xs" variant={`${b.default ? "default" : ""}`} ml="5" onClick={b.onClick}
                      _hover={{backgroundColor: "#72bfca", color: "white"}} data-testid={`${b.label}-button`}>
                  {b.label}
                </Button>
              </Tooltip>
            )
          })
        }
      </ModalFooter>
    </CodapModal>
  )
})
