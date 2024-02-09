import { FormulaHelper as fh } from "../../support/helpers/formula-helper"

context("Formula Engine", () => {
  it("Check arithmetic functions", () => {
    fh.visitURL("")
    fh.importFile("cypress/fixtures/formula.codap3")

    fh.addNewAttribute()
    fh.renameAttribute("newAttr", "abs")
    fh.addFormula("abs", "abs(num)")
    fh.verifyValues("abs", [2, 1, 0, 2, 0.147, 0.976, 1.571, "Infinity", "Infinity", ""])

    fh.addNewAttribute()
    fh.renameAttribute("newAttr", "ceil")
    fh.addFormula("ceil", "ceil(num)")
    fh.verifyValues("ceil", [2, 1, 0, "−2", 0, 1, "−1", "Infinity", "-Infinity", "", ""])

    fh.addNewAttribute()
    fh.renameAttribute("newAttr", "exp")
    fh.addFormula("exp", "exp(num)")
    fh.verifyValues("exp", [7.389, 2.718, 1, 0.135, 0.864, 2.655, 0.208, "Infinity", 0, "", ""])

    fh.addNewAttribute()
    fh.renameAttribute("newAttr", "floor")
    fh.addFormula("floor", "floor(num)")
    fh.verifyValues("floor", [2, 1, 0, "−2", "−1", 0, "−2", "Infinity", "-Infinity", "", ""])

    fh.addNewAttribute()
    fh.renameAttribute("newAttr", "frac")
    fh.addFormula("frac", "frac(num)")
    fh.verifyValues("frac", [0, 0, 0, 0, "−0.147", 0.976, "−0.571", "NaN", "NaN", "", ""])

    fh.addNewAttribute()
    fh.renameAttribute("newAttr", "ln")
    fh.addFormula("ln", "ln(num)")
    fh.verifyValues("ln", [0.693, 0, "-Infinity", "NaN", "NaN", "−0.024", "NaN", "Infinity", "NaN", "", ""])

    fh.addNewAttribute()
    fh.renameAttribute("newAttr", "log")
    fh.addFormula("log", "log(num)")
    fh.verifyValues("log", [0.301, 0, "-Infinity", "NaN", "NaN", "−0.01", "NaN", "Infinity", "NaN", "", ""])

    fh.addNewAttribute()
    fh.renameAttribute("newAttr", "pow")
    fh.addFormula("pow", "pow(num, 2)")
    fh.verifyValues("pow", [4, 1, 0, 4, 0.021, 0.953, 2.468, "Infinity", "Infinity", "", ""])

    fh.addNewAttribute()
    fh.renameAttribute("newAttr", "round")
    fh.addFormula("round", "round(num)")
    fh.verifyValues("round", [2, 1, 0, "−2", 0, 1, "−2", "Infinity", "-Infinity", "", ""])

    fh.addNewAttribute()
    fh.renameAttribute("newAttr", "sqrt")
    fh.addFormula("sqrt", "sqrt(num)")
    fh.verifyValues("sqrt", [1.414, 1, 0, "NaN", "NaN", 0.988, "NaN", "Infinity", "NaN", "", ""])

    fh.addNewAttribute()
    fh.renameAttribute("newAttr", "trunc")
    fh.addFormula("trunc", "trunc(num)")
    fh.verifyValues("trunc", [2, 1, 0, "−2", 0, 0, "−1", "Infinity", "-Infinity", "", ""])

    fh.addNewAttribute()
    fh.renameAttribute("newAttr", "combinations")
    fh.addFormula("combinations", "combinations(num, 1)")
    fh.verifyValues("combinations", [2, 1,
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
    fh.visitURL("")
    fh.importFile("cypress/fixtures/formula.codap3")

    fh.addNewAttribute()
    fh.renameAttribute("newAttr", "prev")
    fh.addFormula("prev", "prev(num, 1)")
    fh.verifyValues("prev", [1, 2, 1, 0, "−2", "−0.147", 0.976, "−1.571", "Infinity", "-Infinity", "foo"])

    fh.addNewAttribute()
    fh.renameAttribute("newAttr", "next")
    fh.addFormula("next", "next(num, 1)")
    fh.verifyValues("next", [1, 0, "−2", "−0.147", 0.976, "−1.571", "Infinity", "-Infinity", "foo", "", 1])

    fh.addNewAttribute()
    fh.renameAttribute("newAttr", "lookupByIndex")
    fh.addFormula("lookupByIndex", `lookupByIndex("Formula", "num", 1)`)
    fh.verifyValues("lookupByIndex", [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2])

    fh.addNewAttribute()
    fh.renameAttribute("newAttr", "lookupByKey")
    fh.addFormula("lookupByKey", `lookupByKey("Formula", "num", "prev",1)`)
    fh.verifyValues("lookupByKey", [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2])
  })
  it("Check logic functions", () => {
    fh.visitURL("")
    fh.importFile("cypress/fixtures/formula.codap3")

    fh.addNewAttribute()
    fh.renameAttribute("newAttr", "boolean")
    fh.addFormula("boolean", "boolean(3+4=7)")
    fh.verifyValues("boolean", ["true", "true", "true", "true", "true", "true", "true", "true", "true", "true", "true"])
  })
  it("Check other functions", () => {
    fh.visitURL("")
    fh.importFile("cypress/fixtures/formula.codap3")

    fh.addNewAttribute()
    fh.renameAttribute("newAttr", "number")
    fh.addFormula("number", `number("45")`)
    fh.verifyValues("number", [45, 45, 45, 45, 45, 45, 45, 45, 45, 45, 45])

    fh.addNewAttribute()
    fh.renameAttribute("newAttr", "random")
    fh.addFormula("random", `if("random(1, 5) > 0 AND random(1, 5) < 6", "true", "false")`)
    fh.verifyValues("random", ["true", "true", "true", "true", "true", "true", "true", "true", "true", "true", "true"])

    fh.addNewAttribute()
    fh.renameAttribute("newAttr", "randomPick")
    fh.addFormula("randomPick", `if("randomPick(1, 2, 3, 4, 5) > 0 AND randomPick(1, 2, 3, 4, 5) < 6",
      "true", "false")`)
    fh.verifyValues("randomPick", ["true", "true", "true", "true", "true", "true", "true", "true", "true",
      "true", "true"])
  })
})
