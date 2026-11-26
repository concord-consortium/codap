import { Completion, CompletionContext, insertCompletionText } from "@codemirror/autocomplete"
import { EditorView } from "@codemirror/view"
import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { EditorState } from "@uiw/react-codemirror"
import { createRef } from "react"
import { DataSetContext } from "../../hooks/use-data-set-context"
import { createDataSet } from "../../models/data/data-set-conversion"
import { IDataSet } from "../../models/data/data-set"
import { getFormulaTestEnv } from "../../models/formula/test-utils/formula-test-utils"
import { formulaLanguageWithHighlighting } from "../../models/formula/lezer/formula-language"
import {
  cmCodapCompletions, cmDataSetState, cmOptionsState, codapHighlightingViewPlugin, kAllOptions
} from "./formula-editor"
import { FormulaEditorApi, FormulaEditorContext } from "./formula-editor-context"
import { InsertValuesMenu } from "./formula-insert-values-menu"

const attrNames = ["1a", "a b", "x", "q`t", "back\\slash"]

function makeDataSet() {
  return createDataSet({
    id: "dataSet",
    name: "dataSet",
    attributes: attrNames.map((name, i) => ({ id: `ATTR${i}`, name }))
  })
}

describe("autocompleting an attribute name", () => {
  // Types `typed` into an editor, then picks the completion labeled `label` and returns the formula.
  function complete(typed: string, label: string, dataSet: IDataSet = makeDataSet()) {
    const state = EditorState.create({
      doc: typed,
      extensions: [cmDataSetState.init(() => dataSet), cmOptionsState.init(() => kAllOptions)]
    })
    const view = new EditorView({ state })
    const result = cmCodapCompletions(new CompletionContext(state, typed.length, true))
    const option = result?.options.find(o => o.label === label) as Completion
    expect(option).toBeDefined()
    const { apply } = option
    if (typeof apply === "function") {
      apply(view, option, result!.from, typed.length)
    } else {
      // CodeMirror's default: insert the `apply` string, or the label if there isn't one
      view.dispatch(insertCompletionText(view.state, apply ?? option.label, result!.from, typed.length))
    }
    const formula = view.state.doc.toString()
    view.destroy()
    return formula
  }

  it("wraps a name that begins with a digit in back-ticks", () => {
    expect(complete("1", "1a")).toBe("`1a`")
  })

  it("wraps a name that contains a space in back-ticks", () => {
    expect(complete("a", "a b")).toBe("`a b`")
  })

  it("inserts a plain name bare", () => {
    expect(complete("x", "x")).toBe("x")
  })

  it("wraps a global value name in back-ticks when necessary", () => {
    // Slider names aren't validated, so a global can have any name.
    const { dataSetsByName: { Mammals }, globalValueManager } = getFormulaTestEnv()
    const [v1, v2] = Array.from(globalValueManager!.globals.values())
    v1.setName("1g")
    v2.setName("g2")
    expect(complete("1", "1g", Mammals)).toBe("`1g`")
    expect(complete("g", "g2", Mammals)).toBe("g2")
  })

  it("escapes a back-tick or backslash inside the name", () => {
    expect(complete("q", "q`t")).toBe("`q\\`t`")
    expect(complete("back", "back\\slash")).toBe("`back\\\\slash`")
  })
})

describe("inserting a value from the Insert Value menu", () => {
  // Opens the menu, picks the item whose text is `itemText`, and returns the formula.
  async function insert(itemText: string) {
    const user = userEvent.setup()
    const view = new EditorView({ state: EditorState.create({ doc: "" }) })
    const editorApi = new FormulaEditorApi(view)
    const buttonRef = createRef<HTMLButtonElement>()
    const onClose = jest.fn()
    const { unmount } = render(
      <DataSetContext.Provider value={makeDataSet()}>
        <FormulaEditorContext.Provider value={{ formula: "", editorApi }}>
          <button ref={buttonRef} type="button" data-testid="anchor" />
          <InsertValuesMenu buttonRef={buttonRef} onClose={onClose} />
        </FormulaEditorContext.Provider>
      </DataSetContext.Provider>
    )
    await user.click(screen.getByRole("menuitem", { name: itemText }))
    const formula = view.state.doc.toString()
    unmount()
    view.destroy()
    return formula
  }

  it("wraps a name that begins with a digit in back-ticks", async () => {
    expect(await insert("1a")).toBe("`1a`")
  })

  it("inserts a plain name bare", async () => {
    expect(await insert("x")).toBe("x")
  })

  it("escapes a back-tick or backslash inside the name", async () => {
    expect(await insert("q`t")).toBe("`q\\`t`")
    expect(await insert("back\\slash")).toBe("`back\\\\slash`")
  })

  it("leaves the constant π unwrapped", async () => {
    expect(await insert("π")).toBe("π")
  })
})

describe("highlighting attribute names", () => {
  function highlightedAttributes(formula: string) {
    const view = new EditorView({
      state: EditorState.create({
        doc: formula,
        extensions: [
          cmDataSetState.init(() => makeDataSet()), cmOptionsState.init(() => kAllOptions),
          formulaLanguageWithHighlighting, codapHighlightingViewPlugin
        ]
      })
    })
    const texts: string[] = []
    view.plugin(codapHighlightingViewPlugin)?.decorations.between(0, formula.length, (from, to, value) => {
      if ((value as any).spec?.class === "codap-attribute") texts.push(view.state.sliceDoc(from, to))
    })
    view.destroy()
    return texts
  }

  it("colors attribute names, including back-ticked names with escaped characters", () => {
    expect(highlightedAttributes("x + `1a` + `q\\`t` + `back\\\\slash`"))
      .toEqual(["x", "`1a`", "`q\\`t`", "`back\\\\slash`"])
  })
})
