import { insertCompletionText, pickedCompletion } from "@codemirror/autocomplete"
import { EditorView } from "@codemirror/view"
import { EditorSelection } from "@uiw/react-codemirror"
import { createContext, useContext, useState } from "react"

export class FormulaEditorApi {
  editorView: EditorView

  constructor(editorView: EditorView) {
    this.editorView = editorView
  }

  get selectionRange() {
    return this.editorView.state.selection.main
  }

  focus() {
    this.editorView.focus()
  }

  insertString(str: string) {
    const { from, to } = this.selectionRange
    this.editorView.dispatch({
      ...insertCompletionText(this.editorView.state, str, from, to),
      annotations: pickedCompletion.of({ label: str })
    })
  }

  insertFunctionString(fnStr: string) {
    // capture the initial selection position
    const { from: initialSelectionFrom } = this.selectionRange

    // insert the function string
    this.insertString(fnStr)

    // select the first argument (if any)
    const execResult = /.+(\([^,)]+)[,)]/.exec(fnStr)
    const parenAndFirstArg = execResult?.[1]
    if (fnStr && parenAndFirstArg) {
      const from = initialSelectionFrom + fnStr.indexOf(parenAndFirstArg) + 1
      const to = from + parenAndFirstArg.length - 1
      if (from >= 0 && to >= 0 && from < to) {
        // setTimeout seems to be required on Safari
        setTimeout(() => {
          this.editorView.dispatch({
            selection: EditorSelection.single(from, to)
          })
        })
      }
    }

    this.focus()
  }

  insertVariableString(varStr: string) {
    this.insertString(varStr)
    this.focus()
  }
}

interface IFormulaEditorState {
  formula: string
  setFormula?: React.Dispatch<React.SetStateAction<string>>
  editorApi?: FormulaEditorApi
  setEditorApi?: React.Dispatch<React.SetStateAction<Maybe<FormulaEditorApi>>>
}

export const FormulaEditorContext = createContext<IFormulaEditorState>({ formula: "" })

export function useFormulaEditorState(initialFormula: string) {
  const [formula, setFormula] = useState(initialFormula)
  const [editorApi, setEditorApi] = useState<Maybe<FormulaEditorApi>>()
  return { formula, setFormula, editorApi, setEditorApi }
}

export function useFormulaEditorContext() {
  return useContext(FormulaEditorContext)
}
