import {
  acceptCompletion, autocompletion, closeBrackets, closeBracketsKeymap, Completion, CompletionContext,
  completionKeymap, CompletionResult, insertCompletionText, pickedCompletion
} from "@codemirror/autocomplete"
import { defaultKeymap } from "@codemirror/commands"
import { defaultHighlightStyle, syntaxHighlighting, syntaxTree } from "@codemirror/language"
import { Decoration, DecorationSet, keymap, EditorView, ViewPlugin } from "@codemirror/view"
import { EditorState, StateField } from "@codemirror/state"
import CodeMirror, {
  drawSelection, Extension, KeyBinding, Prec, RangeSet, RangeSetBuilder, RangeValue,
  ReactCodeMirrorRef, StateEffect, ViewUpdate
} from "@uiw/react-codemirror"
import React, { useCallback, useRef } from "react"
import { useMemo } from "use-memo-one"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { boundaryManager } from "../../models/boundaries/boundary-manager"
import { IDataSet } from "../../models/data/data-set"
import { typedFnRegistry } from "../../models/formula/functions/math"
import { formulaLanguageWithHighlighting } from "../../models/formula/lezer/formula-language"
import { getSharedModelManager } from "../../models/tiles/tile-environment"
import { getGlobalValueManager } from "../../models/global/global-value-manager"
import { FormulaEditorApi, useFormulaEditorContext } from "./formula-editor-context"

import styles from './edit-formula-modal.scss'

interface ICompletionOptions {
  attributes: boolean
  boundaries: boolean
  constants: boolean
  functions: boolean
  globals: boolean
  specials: boolean
}

const kAllOptions: ICompletionOptions = {
  attributes: true, boundaries: true, constants: true, functions: true, globals: true, specials: true
}

interface IProps {
  // options default to true if not specified
  options?: Partial<ICompletionOptions>
  editorHeight?: number
}

/*
 * editor state fields
 */

// Define a CodeMirror state effect (transition) for setting the data set in the editor state
const cmUpdateDataSetEffect = StateEffect.define<IDataSet | null>()

// Define a CodeMirror state field to store the data set with the editor state
const cmDataSetState = StateField.define<IDataSet | null>({
  create: () => null,
  update: (value, transaction) => {
    for (const effect of transaction.effects) {
      if (effect.is(cmUpdateDataSetEffect)) {
        return effect.value
      }
    }
    return value
  },
  toJSON: (value) => value?.id,
  fromJSON: (json) => null
})

// Define a CodeMirror state effect (transition) for setting the completion options in the editor state
const cmUpdateOptionsEffect = StateEffect.define<ICompletionOptions | null>()

// Define a CodeMirror state field to store the completion options in the editor state
const cmOptionsState = StateField.define<ICompletionOptions | null>({
  create: () => null,
  update: (value, transaction) => {
    for (const effect of transaction.effects) {
      if (effect.is(cmUpdateOptionsEffect)) {
        return effect.value
      }
    }
    return value
  },
  toJSON: (value) => JSON.stringify(value),
  fromJSON: (json) => JSON.parse(json)
})

/*
 * autocomplete
 */

function cmCodapCompletions(context: CompletionContext): CompletionResult | null {
  const before = context.matchBefore(/\w+/)
  // getting my completions and storing it in completions variable
  const dataSet = context.state.field(cmDataSetState)
  const options = context.state.field(cmOptionsState)
  const attributes = options?.attributes
                      ? dataSet?.attributes.map(attr => ({
                          label: attr.name,
                          apply: (view: EditorView, completion: Completion, from: number, to: number) => {
                            let label = completion.label
                            // if the attribute name has any non-alphanumeric chars, wrap it in backticks
                            if (/[^\w]/.test(label)) label = `\`${label}\``
                            // apply the completion
                            view.dispatch({
                              ...insertCompletionText(view.state, label, from, to),
                              annotations: pickedCompletion.of(completion)
                            })
                          }
                        })) ?? []
                      : []
  const constants = options?.constants ? [
    { label: "e" },
    { label: "pi",
      // provide a custom apply function so we can convert "pi" to "π"
      apply: (view: EditorView, completion: Completion, from: number, to: number) => {
        // apply the completion
        view.dispatch({
          ...insertCompletionText(view.state, "π", from, to),
          annotations: pickedCompletion.of(completion)
        })
      }
    },
    { label: "π" }
  ] : []
  const specials = options?.specials ? [{ label: "caseIndex" }] : []
  const boundaries = options?.boundaries
                      ? Array.from(boundaryManager.boundaryKeys.map(key => ({ label: key })))
                      : []
  const globalManager = dataSet && options?.globals
                          ? getGlobalValueManager(getSharedModelManager(dataSet))
                          : undefined
  const globals = globalManager
                    ? Array.from(globalManager.globals.values()).map(global => ({ label: global.name }))
                    : []
  const functions: Completion[] = options?.functions ? Object.keys(typedFnRegistry).map(fnName => ({
    label: `${fnName}()`,
    // provide a custom apply function so we can place the caret between the parentheses
    apply: (view: EditorView, completion: Completion, from: number, to: number) => {
      const hasParens = view.state.sliceDoc(to, to + 1) === "("
      const replaceStr =  hasParens ? fnName : `${fnName}()`
      // apply the completion
      view.dispatch({
        ...insertCompletionText(view.state, replaceStr, from, to),
        annotations: pickedCompletion.of(completion)
      })
      if (!hasParens) {
        // put the caret between the parentheses of the function
        const selectionStart = view.state.selection.main.from
        const transaction = view.state.update({ selection: { anchor: selectionStart - 1 } })
        view.dispatch(transaction)
      }
    }
  })) : []
  const completions: Completion[] = [
    ...attributes, ...constants, ...specials, ...boundaries, ...globals, ...functions
  ]

  if (!before || before.to === before.from) return null

  return {
    from: before.from,
    options: completions,
    validFor: /^\w*$/,
  }
}

/*
 * syntax highlighting
 */

// map from node type to a function which returns the appropriate codap-specific highlight class (if any)
type HighlightFn = (nodeText: string, data: IDataSet | null, options: ICompletionOptions) => Maybe<string>
const highlightClasses: Record<string, HighlightFn> = {
  FunctionName: (nodeText, data, options) => {
    if (options.functions && typedFnRegistry[nodeText]) return "codap-function"
  },
  VariableName: (nodeText, data, options) => {
    if (options.attributes && data?.getAttributeByName(nodeText)) return "codap-attribute"
    if (options.constants && ["e", "pi", "π"].includes(nodeText)) return "codap-constant"
    if (options.specials && ["caseIndex"].includes(nodeText)) return "codap-special"

    if (boundaryManager.isBoundarySet(nodeText)) return "codap-boundary"

    const globalManager = options.globals ? getGlobalValueManager(getSharedModelManager(data)) : undefined
    if (globalManager?.getValueByName(nodeText)) return "codap-global"
  }
}

// function which traverses the syntax tree applying codap-specific highlight classes where appropriate
function addCodapHighlightingClasses(view: EditorView) {
  const tree = syntaxTree(view.state)
  const dataSet = view.state.field(cmDataSetState)
  const options = view.state.field(cmOptionsState)
  const builder = new RangeSetBuilder()

  // Traverse the syntax tree
  tree.iterate({
    enter(node) {
      let nodeText = view.state.doc.sliceString(node.from, node.to)
      // highlight attribute names in backticks
      const execResult = /^`(.+)`$/.exec(nodeText)
      if (execResult?.[1]) nodeText = execResult[1]
      const highlightClass = highlightClasses[node.type.name]?.(nodeText, dataSet, options ?? kAllOptions)
      if (highlightClass) {
        builder.add(node.from, node.to, Decoration.mark({ class: highlightClass }))
      }
    }
  })

  return builder.finish()
}

class CodapHighlightingPluginClass {
  decorations: RangeSet<RangeValue>

  constructor(view: EditorView) {
    this.decorations = addCodapHighlightingClasses(view)
  }

  update(update: ViewUpdate) {
    this.decorations = addCodapHighlightingClasses(update.view)
  }
}

// Define the view plugin
const codapHighlightingViewPlugin = ViewPlugin.fromClass(
  CodapHighlightingPluginClass, {
    decorations: (v: CodapHighlightingPluginClass) => v.decorations as DecorationSet
  }
)

/*
 * editor configuration
 */
function cmExtensionsSetup() {
  let keymaps: KeyBinding[] = []
  keymaps = keymaps.concat(closeBracketsKeymap)
  keymaps = keymaps.concat(defaultKeymap)
  keymaps = keymaps.concat(completionKeymap)
  const extensions: Extension[] = [
    cmDataSetState,
    cmOptionsState,
    drawSelection(),
    EditorView.lineWrapping,
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    closeBrackets(),
    formulaLanguageWithHighlighting,
    autocompletion({
      override: [cmCodapCompletions],
    }),
    codapHighlightingViewPlugin,
    keymap.of(keymaps.flat()),
    Prec.highest(
      keymap.of([
        // Tab key accepts auto-complete suggestion (https://discuss.codemirror.net/t/tab-autocompletion/6396)
        { key: "Tab", run: acceptCompletion },
        // Prevents CodeMirror's default behavior for Cmd-Enter key
        { key: "Mod-Enter", run: () => true }
      ])
    )
  ]
  return extensions.filter(Boolean)
}

export function FormulaEditor({ options: _options, editorHeight = +styles.editFormulaModalMinHeight }: IProps) {
  const dataSet = useDataSetContext()
  const jsonOptions = JSON.stringify(_options ?? {})
  const options = useMemo(() => JSON.parse(jsonOptions), [jsonOptions])
  const cmRef = useRef<ReactCodeMirrorRef>(null)
  const extensions = useMemo(() => cmExtensionsSetup(), [])
  const { formula, setFormula, setEditorApi } = useFormulaEditorContext()

  // update the editor state field with the appropriate data set
  const handleCreateEditor = useCallback((view: EditorView, state: EditorState) => {
    view.dispatch({ effects: cmUpdateDataSetEffect.of(dataSet ?? null) })
    const fullOptions: ICompletionOptions = { ...kAllOptions, ...(options || {}) }
    view.dispatch({ effects: cmUpdateOptionsEffect.of(fullOptions) })

    setEditorApi?.(new FormulaEditorApi(view))

    // https://discuss.codemirror.net/t/how-to-autofocus-in-cm6/2966
    const focusTimer = setInterval(() => {
      view.focus()
      if (view.hasFocus) clearInterval(focusTimer)
    }, 100)
  }, [dataSet, options, setEditorApi])

  const handleFormulaChange = (value: string, viewUpdate: ViewUpdate) => setFormula?.(value)

  // .input-element indicates to CodapModal not to drag the modal from within the element
  const classes = "formula-editor-input input-element"
  return <CodeMirror ref={cmRef} className={classes} data-testid="formula-editor-input" height="70px"
                     basicSetup={false} extensions={extensions} style={{height: editorHeight}}
                     onCreateEditor={handleCreateEditor}
                     value={formula} onChange={handleFormulaChange} />
}
