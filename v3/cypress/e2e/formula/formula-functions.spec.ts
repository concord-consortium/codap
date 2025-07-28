import { FormulaHelper as fh } from "../../support/helpers/formula-helper"
import { TableTileElements as table } from "../../support/elements/table-tile"

context("Formula Engine", () => {
  const urlParams = "?suppressUnsavedWarning"
  it("Check arithmetic functions", () => {
    fh.visitURL(urlParams)
    fh.importFile("cypress/fixtures/formula.codap3")

    table.addNewAttribute()
    table.renameAttribute("newAttr", "abs")
    table.addFormula("abs", "abs(num)")
    table.verifyFormulaValues("abs", [2, 1, 0, 2, 0.15, 0.98, 1.57, "Infinity", "Infinity", ""])

    table.addNewAttribute()
    table.renameAttribute("newAttr", "ceil")
    table.addFormula("ceil", "ceil(num)")
    table.verifyFormulaValues("ceil", [2, 1, 0, "−2", 0, 1, "−1", "Infinity", "-Infinity", "", ""])

    table.addNewAttribute()
    table.renameAttribute("newAttr", "exp")
    table.addFormula("exp", "exp(num)")
    table.verifyFormulaValues("exp", [7.39, 2.72, 1, 0.14, 0.86, 2.65, 0.21, "Infinity", 0, "", ""])

    table.addNewAttribute()
    table.renameAttribute("newAttr", "floor")
    table.addFormula("floor", "floor(num)")
    table.verifyFormulaValues("floor", [2, 1, 0, "−2", "−1", 0, "−2", "Infinity", "-Infinity", "", ""])

    table.addNewAttribute()
    table.renameAttribute("newAttr", "frac")
    table.addFormula("frac", "frac(num)")
    table.verifyFormulaValues("frac", [0, 0, 0, 0, "−0.15", 0.98, "−0.57", "NaN", "NaN", "", ""])

    table.addNewAttribute()
    table.renameAttribute("newAttr", "ln")
    table.addFormula("ln", "ln(num)")
    table.verifyFormulaValues("ln", [0.69, 0, "-Infinity", "NaN", "NaN", "−0.02", "NaN", "Infinity", "NaN", "", ""])

    table.addNewAttribute()
    table.renameAttribute("newAttr", "log")
    table.addFormula("log", "log(num)")
    table.verifyFormulaValues("log", [0.30, 0, "-Infinity", "NaN", "NaN", "−0.01", "NaN", "Infinity", "NaN", "", ""])

    table.addNewAttribute()
    table.renameAttribute("newAttr", "pow")
    table.addFormula("pow", "pow(num, 2)")
    table.verifyFormulaValues("pow", [4, 1, 0, 4, 0.02, 0.95, 2.47, "Infinity", "Infinity", "", ""])

    table.addNewAttribute()
    table.renameAttribute("newAttr", "round")
    table.addFormula("round", "round(num)")
    table.verifyFormulaValues("round", [2, 1, 0, "−2", 0, 1, "−2", "Infinity", "-Infinity", "", ""])

    table.addNewAttribute()
    table.renameAttribute("newAttr", "sqrt")
    table.addFormula("sqrt", "sqrt(num)")
    table.verifyFormulaValues("sqrt", [1.41, 1, 0, "NaN", "NaN", 0.99, "NaN", "Infinity", "NaN", "", ""])

    table.addNewAttribute()
    table.renameAttribute("newAttr", "trunc")
    table.addFormula("trunc", "trunc(num)")
    table.verifyFormulaValues("trunc", [2, 1, 0, "−2", 0, 0, "−1", "Infinity", "-Infinity", "", ""])

    table.addNewAttribute()
    table.renameAttribute("newAttr", "combinations")
    table.addFormula("combinations", "combinations(num, 1)")
    table.verifyFormulaValues("combinations", [2, 1,
      "❌ k must be less than or equal to n",
      "❌ Positive integer value expected in function combinations",
      "❌ Positive integer value expected in function combinations",
      "❌ Positive integer value expected in function combinations",
      "❌ Positive integer value expected in function combinations",
      "❌ Positive integer value expected in function combinations",
      "❌ Positive integer value expected in function combinations",
      "", ""
    ])
  })
  it("Check lookup functions", () => {
    fh.visitURL(urlParams)
    fh.importFile("cypress/fixtures/formula.codap3")

    table.addNewAttribute()
    table.renameAttribute("newAttr", "prev")
    table.addFormula("prev", "prev(num, 1)")
    table.verifyFormulaValues("prev", [1, 2, 1, 0, "−2", "−0.15", 0.98, "−1.57", "Infinity", "-Infinity", "foo"])

    table.addNewAttribute()
    table.renameAttribute("newAttr", "next")
    table.addFormula("next", "next(num, 1)")
    table.verifyFormulaValues("next", [1, 0, "−2", "−0.15", 0.98, "−1.57", "Infinity", "-Infinity", "foo", "", 1])

    table.addNewAttribute()
    table.renameAttribute("newAttr", "lookupByIndex")
    table.addFormula("lookupByIndex", `lookupByIndex("Formula", "num", 1)`)
    table.verifyFormulaValues("lookupByIndex", [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2])

    table.addNewAttribute()
    table.renameAttribute("newAttr", "lookupByKey")
    table.addFormula("lookupByKey", `lookupByKey("Formula", "num", "prev",1)`)
    table.verifyFormulaValues("lookupByKey", [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2])
  })
  it("Check logic functions", () => {
    fh.visitURL(urlParams)
    fh.importFile("cypress/fixtures/formula.codap3")

    table.addNewAttribute()
    table.renameAttribute("newAttr", "boolean")
    table.addFormula("boolean", "boolean(3+4=7)")
    table.verifyFormulaValues("boolean",
        ["true", "true", "true", "true", "true", "true", "true", "true", "true", "true", "true"])
  })
  it("Check other functions", () => {
    fh.visitURL(urlParams)
    fh.importFile("cypress/fixtures/formula.codap3")

    table.addNewAttribute()
    table.renameAttribute("newAttr", "number")
    table.addFormula("number", `number("45")`)
    table.verifyFormulaValues("number", [45, 45, 45, 45, 45, 45, 45, 45, 45, 45, 45])

    table.addNewAttribute()
    table.renameAttribute("newAttr", "random")
    table.addFormula("random", `if("random(1, 5) > 0 AND random(1, 5) < 6", "true", "false")`)
    table.verifyFormulaValues("random",
        ["true", "true", "true", "true", "true", "true", "true", "true", "true", "true", "true"])

    table.addNewAttribute()
    table.renameAttribute("newAttr", "randomPick")
    table.addFormula("randomPick", `if("randomPick(1, 2, 3, 4, 5) > 0 AND randomPick(1, 2, 3, 4, 5) < 6",
      "true", "false")`)
    table.verifyFormulaValues("randomPick", ["true", "true", "true", "true", "true", "true", "true", "true", "true",
      "true", "true"])
  })
})
