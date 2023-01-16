import { Button, CloseButton, Flex, Text, Input, useToast } from "@chakra-ui/react"
import React, { useState } from "react"

import "./calculator.scss"

interface IProps {
  setCalculatorOpen: (open: boolean) => void
}

export const Calculator = ({setCalculatorOpen}: IProps) => {
  const [calcValue, setCalcValue] = useState("")
  const [justEvaled, setJustEvaled] = useState(false)
  const toast = useToast()

  const clearValue = () => {
    setCalcValue("")
  }
  const insertSymbol = (symbol: string) => { //parenthesis or decimal point
    if (justEvaled) {
      clearValue()
    }
    insert(symbol)
  }
  const insert = (strToInsert: string) => {
    if (justEvaled && !isNaN(parseInt(strToInsert, 10))) {
      clearValue()
      setJustEvaled(false)
      if (calcValue === "") { setCalcValue(strToInsert) }
      else  { setCalcValue(calcValue.concat(strToInsert)) }
    } else {
      setCalcValue(calcValue.concat(strToInsert))
    }
  }
  const evaluate = () => {
    // eslint-disable-next-line no-useless-escape
    const input = calcValue.replace(/[^0-9()+\-*\/.]/g, "") //sanitize input
    if (calcValue.includes("(") && !calcValue.includes(")")) {
      toast({
        title: "Invalid expression",
        description: `Need closing parenthesis ")"`,
        status: "success",
        duration: 5000,
        isClosable: true,
      })
    } else {
      try {
        const solution = eval(input)
        !isNaN(solution) && setCalcValue(solution)
        setJustEvaled(true)
      } catch  (error) {
        setCalcValue(`Error`)
      }
    }
  }

  const handleEvaluateButtonPress = () => {
    evaluate()
  }

  const calcButtonsArr = [
    {"C": ()=>clearValue()},
    {"(": ()=>insertSymbol("(")},
    {")": ()=>insertSymbol(")")},
    {"/": ()=>insertSymbol("/")},
    {"7": ()=>insert("7")},
    {"8": ()=>insert("8")},
    {"9": ()=>insert("9")},
    {"X": ()=>insertSymbol("*")},
    {"4": ()=>insert("4")},
    {"5": ()=>insert("5")},
    {"6": ()=>insert("6")},
    {"-": ()=>insertSymbol("-")},
    {"1": ()=>insert("1")},
    {"2": ()=>insert("2")},
    {"3": ()=>insert("3")},
    {"+": ()=>insertSymbol("+")},
    {"0": ()=>insert("0")},
    {".": ()=>insertSymbol(".")}
  ]

  const calcButtons: React.ReactElement[] = []
  calcButtonsArr.forEach((button:Record<string,any>) => {
    for (const key in button) {
      calcButtons.push(
        <Button key={key} className="calc-button" onClick={button[key]}>
         {key}
        </Button>
      )
    }
  })
  return (
    <Flex className="calculator-wrapper" flexDirection="column">
      <Flex className="titlebar">
        <span className="title-text">Calculator</span>
        <CloseButton className="titlebar-close" onClick={()=>setCalculatorOpen(false)}/>
      </Flex>
      <Flex className="calculator" data-testid="codap-calculator" direction="column">
        <Text className="calc-input" backgroundColor="white" height="30px">{calcValue}</Text>
        <Flex className="calc-buttons">
            {calcButtons}
            <Button className="calc-button wide" onClick={handleEvaluateButtonPress}>=</Button>
        </Flex>
      </Flex>
    </Flex>
  )
}
