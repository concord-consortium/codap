import {
  Button, Flex, FormControl, FormLabel, Input, Menu, MenuButton, MenuGroup, MenuItem, MenuList, ModalBody, ModalCloseButton, ModalFooter, ModalHeader,
  Textarea, Tooltip
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
    onClose()
  }

  const handleFormulaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => setFormula(e.target.value)

  const renderOperandMenu = () => {
    console.log("openOperandMenu clicked")
    const attributeNames = dataSet?.attributes.map(attr => attr.name)
    return (
      <Menu>
        <MenuButton ml="5" _hover={{backgroundColor: "#72bfca", color: "white"}} data-testid="formula-operand-button">
          {t("DG.AttrFormView.operandMenuTitle")}
        </MenuButton>
        <MenuGroup>
          <MenuList>
            {attributeNames?.map((attrName) => {
              return (
                <MenuItem key={attrName} onClick={() => setFormula(formula + attrName)}>
                  {attrName}
                </MenuItem>
              )
            })}
          </MenuList>
        </MenuGroup>
        <MenuGroup>
          <MenuList>
            <MenuItem onClick={() => setFormula(`${formula  }caseIndex`)}>caseIndex</MenuItem>
          </MenuList>
        </MenuGroup>
        <MenuGroup>
          <MenuList>
            <MenuItem onClick={() => setFormula(`${formula  }e`)}>e</MenuItem>
            <MenuItem onClick={() => setFormula(`${formula  }false`)}>false</MenuItem>
            <MenuItem onClick={() => setFormula(`${formula  }true`)}>true</MenuItem>
            <MenuItem onClick={() => setFormula(`${formula  }π`)}>π</MenuItem>
          </MenuList>
        </MenuGroup>
      </Menu>
    )
  }

  const insertFunctionToFormula = (func: any) => {
    console.log("insertFunctionToFormula clicked")
    // insert the function to the formula
    setFormula(formula + func.function)
  }

  const showFunctionsList = (category: string) => {
    console.log("showFunctionsList clicked")
    // get functions list for the category
    const categoryObj = functionStringMap.find((categoryItem) => categoryItem.category === category)
    console.log(categoryObj)
    // show a menu of a list of functions
    return (
      <Menu>
        <MenuList>
          {categoryObj?.functions.map((func) => {
            return (
              <MenuItem className="function-menu-item" key={func.displayName}
                        onClick={()=>insertFunctionToFormula(func)}>
                <span className="function-menu-name">{func.displayName}</span>
                <span className="function-info-button" data-testid="function-info-button">ⓘ</span>
              </MenuItem>
            )
          })}
        </MenuList>
      </Menu>
    )
  }

  const renderFunctionMenu = () => {
    console.log("openFunctionMenu clicked")
    //get the displayName for the categories from the functionStringMap
    const functionCategories = functionStringMap.map((category) => {
      // console.log("category: ", category, "displayName: ", category.displayName)
      return category.displayName
    })
    // console.log(functionCategories)
    // show a menu of a list of category.displayName
    return (
      <Menu>
        <MenuButton ml="5" _hover={{backgroundColor: "#72bfca", color: "white"}} data-testid="formula-function-button">
          {t("DG.AttrFormView.functionMenuTitle")}
        </MenuButton>
        <MenuList>
          {functionStringMap.map((category) => {
            console.log("category: ", category)
            return (
              <MenuItem key={category.category} onClick={()=>showFunctionsList(category.category)}>
                {category.displayName} Functions
              </MenuItem>
            )
          })}
        </MenuList>
      </Menu>
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
      <ModalBody>
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
        <Flex flexDirection="row" justifyContent="space-between">
          {renderOperandMenu()}
          {renderFunctionMenu()}
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
