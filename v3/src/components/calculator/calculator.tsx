import { Button, Flex, Input } from "@chakra-ui/react"
import React, { useCallback, useEffect, useRef, useState } from "react"
import { logMessageWithReplacement } from "../../lib/log-message"
import { math } from "../../models/formula/functions/math"
import { preprocessDisplayFormula } from "../../models/formula/utils/canonicalization-utils"
import { mstAutorun } from "../../utilities/mst-autorun"
import { ITileBaseProps } from "../tiles/tile-base-props"
import { isCalculatorModel } from "./calculator-model"

import "./calculator.scss"

// Operations that continue a calculation when typed after evaluation
const kOperations = ["+", "-", "*", "/", "("]

export const CalculatorComponent = ({ tile }: ITileBaseProps) => {
  const [calcValue, setCalcValue] = useState("")
  const [justEvaled, setJustEvaled] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const calculatorModel = tile?.content
  const isValidModel = isCalculatorModel(calculatorModel)

  // Focus the input when the calculator opens
  useEffect(() => {
    if (isValidModel && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isValidModel])

  // Sync component state from model (enables undo/redo)
  useEffect(() => {
    return mstAutorun(() => {
      if (isCalculatorModel(calculatorModel)) {
        setCalcValue(calculatorModel.value)
        setJustEvaled(false)
      }
    }, { name: "Calculator.syncFromModel" }, calculatorModel)
  }, [calculatorModel])

  const clearValue = useCallback(() => {
    setCalcValue("")  // Clear local state (model sync won't trigger if model value unchanged)
    setJustEvaled(false)
    if (isValidModel) {
      calculatorModel?.applyModelChange(() => {
        calculatorModel.setValue()
      }, {
        undoStringKey: "V3.Undo.calculator.clear",
        redoStringKey: "V3.Redo.calculator.clear",
        log: {message: "Calculator value cleared", args: {}, category: "calculator"}
      })
    }
    // Focus the input after clearing
    inputRef.current?.focus()
  }, [calculatorModel, isValidModel])

  const insert = useCallback((strToInsert: string) => {
    if (justEvaled) {
      if (kOperations.includes(strToInsert)) {
        // Keep the result and append the operator
        setCalcValue(prev => `${prev}${strToInsert}`)
      } else {
        // Start fresh with the new input
        setCalcValue(strToInsert)
      }
      setJustEvaled(false)
    } else {
      // Insert at cursor position if we have a reference to the input
      if (inputRef.current) {
        const start = inputRef.current.selectionStart ?? calcValue.length
        const end = inputRef.current.selectionEnd ?? calcValue.length
        const newValue = calcValue.slice(0, start) + strToInsert + calcValue.slice(end)
        setCalcValue(newValue)
        // Set cursor position after the inserted text
        requestAnimationFrame(() => {
          if (inputRef.current) {
            const newPos = start + strToInsert.length
            inputRef.current.setSelectionRange(newPos, newPos)
            inputRef.current.focus()
          }
        })
      } else {
        setCalcValue(prev => `${prev}${strToInsert}`)
      }
    }
    // Keep focus on input after button click
    inputRef.current?.focus()
  }, [justEvaled, calcValue])

  const handleEvaluate = useCallback(() => {
    if (justEvaled || !calcValue.trim()) return
    // Don't try to evaluate error messages
    if (calcValue.startsWith("#")) return

    try {
      const canonicalFormula = preprocessDisplayFormula(calcValue)
      const compiled = math.compile(canonicalFormula)
      const solution = compiled.evaluate({ "π": Math.PI })
      const solutionStr = String(solution)
      if (isValidModel) {
        calculatorModel?.applyModelChange(() => {
          calculatorModel.setValue(solutionStr)
        }, {
          undoStringKey: "V3.Undo.calculator.calculate",
          redoStringKey: "V3.Redo.calculator.calculate",
          log: logMessageWithReplacement("Calculation done: %@ = %@", {calcValue, solution: solutionStr}, "calculator")
        })
      }
    } catch (error: any) {
      const errorMessage = error?.message ? `#${error.message}` : "#Error"
      if (isValidModel) {
        calculatorModel?.applyModelChange(() => {
          calculatorModel.setValue(errorMessage)
        }, {
          undoStringKey: "V3.Undo.calculator.calculate",
          redoStringKey: "V3.Redo.calculator.calculate",
          log: logMessageWithReplacement("Calculation error: %@ = %@", {calcValue, error: errorMessage}, "calculator")
        })
      }
    }
    setJustEvaled(true)
  }, [justEvaled, calcValue, calculatorModel, isValidModel])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (justEvaled) {
      // If just evaluated and user starts typing, check what they're typing
      const newChar = e.target.value.slice(-1)
      if (kOperations.includes(newChar)) {
        // Keep result and append operator
        setCalcValue(prev => prev + newChar)
      } else {
        // Start fresh
        setCalcValue(e.target.value)
      }
      setJustEvaled(false)
    } else {
      setCalcValue(e.target.value)
    }
  }, [justEvaled])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleEvaluate()
    } else if (e.key === "Escape") {
      e.preventDefault()
      clearValue()
    } else if (e.key === "=") {
      e.preventDefault()
      handleEvaluate()
    }
  }, [handleEvaluate, clearValue])

  if (!isValidModel) return null

  const calcButtonsArr = [
    {"C": ()=>clearValue()},
    {"(": ()=>insert("(")},
    {")": ()=>insert(")")},
    {"/": ()=>insert("/")},
    {"7": ()=>insert("7")},
    {"8": ()=>insert("8")},
    {"9": ()=>insert("9")},
    {"X": ()=>insert("*")},
    {"4": ()=>insert("4")},
    {"5": ()=>insert("5")},
    {"6": ()=>insert("6")},
    {"\u2212": ()=>insert("-")},
    {"1": ()=>insert("1")},
    {"2": ()=>insert("2")},
    {"3": ()=>insert("3")},
    {"+": ()=>insert("+")},
    {"0": ()=>insert("0")},
    {".": ()=>insert(".")}
  ]

  const calcButtons: React.ReactElement[] = []
  calcButtonsArr.forEach((button:Record<string, any>) => {
    for (const key in button) {
      calcButtons.push(
        <Button key={key} className="calc-button" onClick={button[key]}
        data-testid="calc-button">
         {key}
        </Button>
      )
    }
  })
  return (
    <Flex className="calculator-wrapper">
      <Flex className="calculator" data-testid="codap-calculator">
        <Input
          ref={inputRef}
          className="calc-input"
          data-testid="calc-input"
          aria-label="Calculator display"
          value={calcValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          spellCheck={false}
        />
        <Flex className="calc-buttons">
            {calcButtons}
            <Button className="calc-button wide" onClick={handleEvaluate}
            data-testid="calc-button">
              =
            </Button>
        </Flex>
      </Flex>
    </Flex>
  )
}
