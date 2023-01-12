import { Button, CloseButton, Flex, Input } from "@chakra-ui/react"
import React, { useState } from "react"

import "./calculator.scss"

interface IProps {
  setCalculatorOpen: (open: boolean) => void
}

export const Calculator = ({setCalculatorOpen}: IProps) => {
  const [calcValue, setCalcValue] = useState("")
  const [justEvaled, setJustEvaled] = useState(false)

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
    if (justEvaled && !isNaN( parseInt(strToInsert, 10))) {
      clearValue()
      setJustEvaled(false)
      if (calcValue === "") { setCalcValue(strToInsert) }
      else  { setCalcValue(calcValue.concat(strToInsert)) }
    } else {
      setCalcValue(calcValue.concat(strToInsert))
    }
  }
  const evaluate = () => {
    const input = calcValue.replace(/[^0-9()+\-*/.]/g, "") //sanitize input
    const solution = eval(input)
    !isNaN(solution) && setCalcValue(solution)
    setJustEvaled(true)
  }

  const handleEvaluateButtonPress = () => {
    evaluate()
  }

  const handleKeyPress = (e: any) => {
    const {key} = e
    console.log("in handleKeyPress", key)
    // const validKeyChar = /[^0-9()+\-*/.]/
    const validKeyChar = /[0-9()+\-*/$]/
    if (validKeyChar.test(key)) console.log("key was", key)

    if (key === "=" || key === "Enter") {
      evaluate()
    }
    if (key === "Esacpe") {
      clearValue()
    }
    // if (key === "Delete" || key === "Backspace") {
    //   setCalcValue(calcValue.slice(-1))
    // }

    const calcInput = calcButtonsArr[key]
    const idx = calcInput && calcButtonsArr.indexOf(calcInput)
    // idx && calcButtonsArr[idx].value
  }

  // const calcButtonsArr = [
  //   {"button": "C", "handler": clearValue},
  //   {"button": "(", "handler": ()=>insertSymbol( "(" )},
  //   {"button": ")", "handler": ()=>insertSymbol( ")" )},
  //   {"button": "/", "handler": ()=>insertSymbol( " / " )},
  //   {"button": "7", "handler": ()=>insert( "7" )},
  //   {"button": "8", "handler": ()=>insert( "8" )},
  //   {"button": "9", "handler": ()=>insert( "9" )},
  //   {"button": "X", "handler": ()=>insertSymbol( " * " )},
  //   {"button": "4", "handler": ()=>insert( "4" )},
  //   {"button": "5", "handler": ()=>insert( "5" )},
  //   {"button": "6", "handler": ()=>insert( "6" )},
  //   {"button": "-", "handler": ()=>insertSymbol( "-" )},
  //   {"button": "1", "handler": ()=>insert( "1" )},
  //   {"button": "2", "handler": ()=>insert( "2" )},
  //   {"button": "3", "handler": ()=>insert( "3" )},
  //   {"button": "+", "handler": ()=>insertSymbol( " + " )},
  //   {"button": "0", "handler": ()=>insert( "0" )},
  //   {"button": ".", "handler": ()=>insertSymbol( "." )}
  // ]

  const calcButtonsArr = [
    {"C": ()=>clearValue()},
    {"(": ()=>insertSymbol( "(" )},
    {")": ()=>insertSymbol( ")" )},
    {"/": ()=>insertSymbol( "/" )},
    {"7": ()=>insert( "7" )},
    {"8": ()=>insert( "8" )},
    {"9": ()=>insert( "9" )},
    {"X": ()=>insertSymbol( "*" )},
    {"4": ()=>insert( "4" )},
    {"5": ()=>insert( "5" )},
    {"6": ()=>insert( "6" )},
    {"-": ()=>insertSymbol( "-" )},
    {"1": ()=>insert( "1" )},
    {"2": ()=>insert( "2" )},
    {"3": ()=>insert( "3" )},
    {"+": ()=>insertSymbol( "+" )},
    {"0": ()=>insert( "0" )},
    {".": ()=>insertSymbol( "." )}
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
        <Input className="calc-input" backgroundColor="white" height="30px" value={calcValue}
          onChange={(e)=>handleKeyPress(e)} onKeyPress={(e)=>handleKeyPress(e)}/>
        <Flex className="calc-buttons">
            {calcButtons}
            <Button className="calc-button wide" onClick={handleEvaluateButtonPress}>=</Button>
        </Flex>
      </Flex>
    </Flex>
  )
}
