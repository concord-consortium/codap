import { Button, Flex, Text, useToast } from "@chakra-ui/react"
import React, { useState } from "react"
import { ITileBaseProps } from "../tiles/tile-base-props"
import { isCalculatorModel } from "./calculator-model"
import { evaluate } from "mathjs"

import "./calculator.scss"

export const CalculatorComponent = ({ tile }: ITileBaseProps) => {
  const [calcValue, setCalcValue] = useState("")
  const [justEvaled, setJustEvaled] = useState(false)

  const calculatorModel = tile?.content
  if (!isCalculatorModel(calculatorModel)) return null

  const clearValue = () => {
    setCalcValue("")
    setJustEvaled(false)
  }

  const insert = (strToInsert: string) => {
    const operation = ["+", "-", "*", "/", "("]
    if (justEvaled) {
      const prevValue = calcValue
      clearValue()
      setJustEvaled(false)
      if (operation.includes(strToInsert)) {
        setCalcValue(()=>`${prevValue}${strToInsert}`)
      } else {
        setCalcValue((ex)=>`${ex}${strToInsert}`)
      }
    } else {
      setCalcValue((ex)=>`${ex}${strToInsert}`)
    }
  }

  const handleEvaluateButtonPress = () => {
    if (justEvaled) return
    // if (calcValue.includes("(") && !calcValue.includes(")")) {
    //   toast({
    //     title: "Invalid expression",
    //     description: `Need closing parenthesis ")"`,
    //     status: "success",
    //     duration: 5000,
    //     isClosable: true
    //   })
    // } else {
      try {
        const solution = evaluate(calcValue)
        !isNaN(solution) && setCalcValue(solution)
      } catch  (error) {
        setCalcValue(`Error`)
      }
      setJustEvaled(true)
    // }
  }

  const calcButtonsArr = [
    {"C": ()=>clearValue()},
    {"\u0028": ()=>insert("(")},
    {"\u0029": ()=>insert(")")},
    {"\u002F": ()=>insert("/")},
    {"7": ()=>insert("7")},
    {"8": ()=>insert("8")},
    {"9": ()=>insert("9")},
    {"\u0058": ()=>insert("*")},
    {"4": ()=>insert("4")},
    {"5": ()=>insert("5")},
    {"6": ()=>insert("6")},
    {"\u002D": ()=>insert("-")},
    {"1": ()=>insert("1")},
    {"2": ()=>insert("2")},
    {"3": ()=>insert("3")},
    {"\u002B": ()=>insert("+")},
    {"0": ()=>insert("0")},
    {"\u002E": ()=>insert(".")}
  ]

  const calcButtons: React.ReactElement[] = []
  calcButtonsArr.forEach((button:Record<string, any>) => {
    for (const key in button) {
      calcButtons.push(
        <Button key={key} className="calc-button" onClick={button[key]}>
         {key}
        </Button>
      )
    }
  })
  return (
    <Flex className="calculator-wrapper">
      <Flex className="calculator" data-testid="codap-calculator">
        <Text className="calc-input">{calcValue}</Text>
        <Flex className="calc-buttons">
            {calcButtons}
            <Button className="calc-button wide" onClick={handleEvaluateButtonPress}>=</Button>
        </Flex>
      </Flex>
    </Flex>
  )
}
