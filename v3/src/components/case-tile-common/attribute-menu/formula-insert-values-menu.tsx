import {Divider, Flex, List, ListItem,} from "@chakra-ui/react"
import React from "react"
import { useDataSetContext } from "../../../hooks/use-data-set-context"

import "./attribute-menu.scss"

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

  const insertValueToFormula = (value: string) => {
    console.log("insertOperandToFormula operand", value)
    // insert operand into the formula at either cursor position or selected range
    const from = editorSelection.from
    const to = editorSelection.to
    console.log("insertOperandToFormula from", from, "to", to)
    console.log("insertOperandToFormula cursorPosition", cursorPosition)

    if (from !== 0 && to !== 0) {
      const formulaStart = formula.slice(0, from)
      const formulaEnd = formula.slice(to)
      setFormula(`${formulaStart}${value}${formulaEnd}`)
    } else if (cursorPosition !== 0) {
      const formulaStart = formula.slice(0, cursorPosition)
      const formulaEnd = formula.slice(cursorPosition)
      setFormula(`${formulaStart}${value}${formulaEnd}`)
    }
    setFormula(formula + value)
    setShowValuesMenu(false)
  }


  const attributeNames = dataSet?.attributes.map(attr => attr.name)
  let maxItemLength = 0
  attributeNames?.forEach((attrName) => {
    if (attrName.length > maxItemLength) {
      maxItemLength = attrName.length
    }
  })


  return (
    <Flex className="formula-operand-list-container" style={{ top: 0, left: 0, width: 40 + 10 * maxItemLength}}>
      <List className="formula-operand-list">
        {attributeNames?.map((attrName) => {
          return (
            <ListItem className="formula-operand-list-item" key={attrName}
                      onClick={() => insertValueToFormula(attrName)}>
              {attrName}
            </ListItem>
          )
        })}
      </List>
      <Divider color={"#A0A0A0"}/>
      <List>
        <ListItem className="formula-operand-list-item" onClick={() => insertValueToFormula("caseIndex")}>
          caseIndex
        </ListItem>
      </List>
      <Divider color={"#A0A0A0"}/>
      <List>
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
    </Flex>
  )
}
