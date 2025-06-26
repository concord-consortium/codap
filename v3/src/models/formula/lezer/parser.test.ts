import { TreeCursor } from "@lezer/common"
import { parser } from "./parser"

// Function to traverse and log the tree and detect errors (useful for debugging tests)
function traverseCursor(formula: string, cursor: TreeCursor) {
  do {
    const nodeType = cursor.type.name;

    // Debugging: Check if the current node is an error
    // if (nodeType === "⚠" || nodeType === "ERROR") {
    //   console.log("Parse Error detected:");
    //   console.log({
    //     from: cursor.from,
    //     to: cursor.to,
    //     text: formula.slice(cursor.from, cursor.to) // Text where the error occurred
    //   });
    // } else {
    //   console.log({
    //     nodeName: nodeType,
    //     from: cursor.from,
    //     to: cursor.to,
    //     text: formula.slice(cursor.from, cursor.to)
    //   });
    // }

    // Traverse child nodes recursively
    if (cursor.firstChild()) {
      traverseCursor(formula, cursor); // Recursively print child nodes
      cursor.parent();        // Move back to parent after processing children
    }
  } while (cursor.nextSibling()); // Move to the next sibling node
}

function findNodeInTree(cursor: TreeCursor, fn: (cursor: TreeCursor) => boolean): TreeCursor | undefined {
  do {
    // Check if the current node is a match
    if (fn(cursor)) return cursor

    // Traverse child nodes recursively
    if (cursor.firstChild()) {
      const found = findNodeInTree(cursor, fn); // Recursively match child nodes
      if (found) return found
      cursor.parent();        // Move back to parent after processing children
    }
  } while (cursor.nextSibling()); // Move to the next sibling node
}

function hasParseError(cursor: TreeCursor) {
  return findNodeInTree(cursor, cursor => ["⚠", "ERROR"].includes(cursor.type.name)) != null
}

describe("Lezer formula parser works as expected", () => {

  it("handles literal values", () => {
    let formula = "1"
    let tree = parser.parse(formula)
    let cursor = tree.cursor()
    expect(cursor.type.name).toBe("SingleExpression")
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("Number")
    expect(formula.slice(cursor.from, cursor.to)).toBe("1")
    expect(cursor.nextSibling()).toBe(false)

    formula = "123.456e7"
    tree = parser.parse(formula)
    cursor = tree.cursor()
    expect(cursor.type.name).toBe("SingleExpression")
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("Number")
    expect(formula.slice(cursor.from, cursor.to)).toBe("123.456e7")
    expect(cursor.nextSibling()).toBe(false)

    formula = `"foo"`
    tree = parser.parse(formula)
    cursor = tree.cursor()
    expect(cursor.type.name).toBe("SingleExpression")
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("String")
    expect(formula.slice(cursor.from, cursor.to)).toBe(`"foo"`)
    expect(cursor.nextSibling()).toBe(false)

    formula = `"non-breaking\xa0space"`
    tree = parser.parse(formula)
    cursor = tree.cursor()
    expect(cursor.type.name).toBe("SingleExpression")
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("String")
    expect(formula.slice(cursor.from, cursor.to)).toBe(formula)
    expect(cursor.nextSibling()).toBe(false)

    formula = `"non-breaking\ua000space"`
    tree = parser.parse(formula)
    cursor = tree.cursor()
    expect(cursor.type.name).toBe("SingleExpression")
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("String")
    expect(formula.slice(cursor.from, cursor.to)).toBe(formula)
    expect(cursor.nextSibling()).toBe(false)

    formula = "true"
    tree = parser.parse(formula)
    cursor = tree.cursor()
    expect(cursor.type.name).toBe("SingleExpression")
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("BooleanLiteral")
    expect(formula.slice(cursor.from, cursor.to)).toBe("true")
    expect(cursor.nextSibling()).toBe(false)

    formula = "false"
    tree = parser.parse(formula)
    cursor = tree.cursor()
    expect(cursor.type.name).toBe("SingleExpression")
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("BooleanLiteral")
    expect(formula.slice(cursor.from, cursor.to)).toBe("false")
    expect(cursor.nextSibling()).toBe(false)
  })

  it("handles unary operators", () => {
    let formula = "-1"
    let tree = parser.parse(formula)
    let cursor = tree.cursor()
    expect(cursor.type.name).toBe("SingleExpression")
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("UnaryExpression")
    expect(formula.slice(cursor.from, cursor.to)).toBe(formula)
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("ArithOp")
    expect(formula.slice(cursor.from, cursor.to)).toBe("-")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("Number")
    expect(formula.slice(cursor.from, cursor.to)).toBe("1")
    expect(cursor.nextSibling()).toBe(false)

    formula = "+1"
    tree = parser.parse(formula)
    cursor = tree.cursor()
    expect(cursor.type.name).toBe("SingleExpression")
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("UnaryExpression")
    expect(formula.slice(cursor.from, cursor.to)).toBe(formula)
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("ArithOp")
    expect(formula.slice(cursor.from, cursor.to)).toBe("+")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("Number")
    expect(formula.slice(cursor.from, cursor.to)).toBe("1")
    expect(cursor.nextSibling()).toBe(false)

    formula = "!1"
    tree = parser.parse(formula)
    cursor = tree.cursor()
    expect(cursor.type.name).toBe("SingleExpression")
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("UnaryExpression")
    expect(formula.slice(cursor.from, cursor.to)).toBe(formula)
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("LogicOp")
    expect(formula.slice(cursor.from, cursor.to)).toBe("!")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("Number")
    expect(formula.slice(cursor.from, cursor.to)).toBe("1")
    expect(cursor.nextSibling()).toBe(false)

    formula = "!true"
    tree = parser.parse(formula)
    cursor = tree.cursor()
    expect(cursor.type.name).toBe("SingleExpression")
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("UnaryExpression")
    expect(formula.slice(cursor.from, cursor.to)).toBe(formula)
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("LogicOp")
    expect(formula.slice(cursor.from, cursor.to)).toBe("!")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("BooleanLiteral")
    expect(formula.slice(cursor.from, cursor.to)).toBe("true")
    expect(cursor.nextSibling()).toBe(false)
  })

  it("handles arithmetic operators", () => {
    let formula = "1 + 2"
    let tree = parser.parse(formula)
    let cursor = tree.cursor()
    expect(cursor.type.name).toBe("SingleExpression")
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("BinaryExpression")
    expect(formula.slice(cursor.from, cursor.to)).toBe(formula)
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("Number")
    expect(formula.slice(cursor.from, cursor.to)).toBe("1")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("ArithOp")
    expect(formula.slice(cursor.from, cursor.to)).toBe("+")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("Number")
    expect(formula.slice(cursor.from, cursor.to)).toBe("2")
    expect(cursor.nextSibling()).toBe(false)

    formula = "1 - 2"
    tree = parser.parse(formula)
    cursor = tree.cursor()
    expect(cursor.type.name).toBe("SingleExpression")
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("BinaryExpression")
    expect(formula.slice(cursor.from, cursor.to)).toBe(formula)
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("Number")
    expect(formula.slice(cursor.from, cursor.to)).toBe("1")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("ArithOp")
    expect(formula.slice(cursor.from, cursor.to)).toBe("-")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("Number")
    expect(formula.slice(cursor.from, cursor.to)).toBe("2")
    expect(cursor.nextSibling()).toBe(false)

    formula = "1 % 2"
    tree = parser.parse(formula)
    cursor = tree.cursor()
    expect(cursor.type.name).toBe("SingleExpression")
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("BinaryExpression")
    expect(formula.slice(cursor.from, cursor.to)).toBe(formula)
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("Number")
    expect(formula.slice(cursor.from, cursor.to)).toBe("1")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("ArithOp")
    expect(formula.slice(cursor.from, cursor.to)).toBe("%")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("Number")
    expect(formula.slice(cursor.from, cursor.to)).toBe("2")
    expect(cursor.nextSibling()).toBe(false)

    formula = "1 * 2"
    tree = parser.parse(formula)
    cursor = tree.cursor()
    expect(cursor.type.name).toBe("SingleExpression")
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("BinaryExpression")
    expect(formula.slice(cursor.from, cursor.to)).toBe(formula)
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("Number")
    expect(formula.slice(cursor.from, cursor.to)).toBe("1")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("ArithOp")
    expect(formula.slice(cursor.from, cursor.to)).toBe("*")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("Number")
    expect(formula.slice(cursor.from, cursor.to)).toBe("2")
    expect(cursor.nextSibling()).toBe(false)

    formula = "1 / 2"
    tree = parser.parse(formula)
    cursor = tree.cursor()
    expect(cursor.type.name).toBe("SingleExpression")
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("BinaryExpression")
    expect(formula.slice(cursor.from, cursor.to)).toBe(formula)
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("Number")
    expect(formula.slice(cursor.from, cursor.to)).toBe("1")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("ArithOp")
    expect(formula.slice(cursor.from, cursor.to)).toBe("/")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("Number")
    expect(formula.slice(cursor.from, cursor.to)).toBe("2")
    expect(cursor.nextSibling()).toBe(false)

    // supports multiplication symbol
    formula = "1 × 2"
    tree = parser.parse(formula)
    cursor = tree.cursor()
    expect(cursor.type.name).toBe("SingleExpression")
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("BinaryExpression")
    expect(formula.slice(cursor.from, cursor.to)).toBe(formula)
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("Number")
    expect(formula.slice(cursor.from, cursor.to)).toBe("1")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("ArithOp")
    expect(formula.slice(cursor.from, cursor.to)).toBe("×")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("Number")
    expect(formula.slice(cursor.from, cursor.to)).toBe("2")
    expect(cursor.nextSibling()).toBe(false)

    // supports multiplication symbol without spaces
    formula = "1×2"
    tree = parser.parse(formula)
    cursor = tree.cursor()
    expect(cursor.type.name).toBe("SingleExpression")
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("BinaryExpression")
    expect(formula.slice(cursor.from, cursor.to)).toBe(formula)
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("Number")
    expect(formula.slice(cursor.from, cursor.to)).toBe("1")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("ArithOp")
    expect(formula.slice(cursor.from, cursor.to)).toBe("×")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("Number")
    expect(formula.slice(cursor.from, cursor.to)).toBe("2")
    expect(cursor.nextSibling()).toBe(false)

    // supports division symbol
    formula = "1 ÷ 2"
    tree = parser.parse(formula)
    cursor = tree.cursor()
    expect(cursor.type.name).toBe("SingleExpression")
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("BinaryExpression")
    expect(formula.slice(cursor.from, cursor.to)).toBe(formula)
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("Number")
    expect(formula.slice(cursor.from, cursor.to)).toBe("1")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("ArithOp")
    expect(formula.slice(cursor.from, cursor.to)).toBe("÷")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("Number")
    expect(formula.slice(cursor.from, cursor.to)).toBe("2")
    expect(cursor.nextSibling()).toBe(false)

    // supports division symbol without spaces
    formula = "1÷2"
    tree = parser.parse(formula)
    cursor = tree.cursor()
    expect(cursor.type.name).toBe("SingleExpression")
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("BinaryExpression")
    expect(formula.slice(cursor.from, cursor.to)).toBe(formula)
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("Number")
    expect(formula.slice(cursor.from, cursor.to)).toBe("1")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("ArithOp")
    expect(formula.slice(cursor.from, cursor.to)).toBe("÷")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("Number")
    expect(formula.slice(cursor.from, cursor.to)).toBe("2")
    expect(cursor.nextSibling()).toBe(false)

    // supports CODAP exponentiation operator
    formula = "1 ^ 2"
    tree = parser.parse(formula)
    cursor = tree.cursor()
    expect(cursor.type.name).toBe("SingleExpression")
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("BinaryExpression")
    expect(formula.slice(cursor.from, cursor.to)).toBe(formula)
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("Number")
    expect(formula.slice(cursor.from, cursor.to)).toBe("1")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("ArithOp")
    expect(formula.slice(cursor.from, cursor.to)).toBe("^")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("Number")
    expect(formula.slice(cursor.from, cursor.to)).toBe("2")
    expect(cursor.nextSibling()).toBe(false)

    // doesn't support JavaScript exponentiation operator
    formula = "1 ** 2"
    tree = parser.parse(formula)
    cursor = tree.cursor()
    expect(hasParseError(cursor)).toBe(true)
  })

  it("handles logical operators", () => {
    // supports CODAP & operator
    let formula = "true & false"
    let tree = parser.parse(formula)
    let cursor = tree.cursor()
    expect(cursor.type.name).toBe("SingleExpression")
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("BinaryExpression")
    expect(formula.slice(cursor.from, cursor.to)).toBe(formula)
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("BooleanLiteral")
    expect(formula.slice(cursor.from, cursor.to)).toBe("true")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("LogicOp")
    expect(formula.slice(cursor.from, cursor.to)).toBe("&")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("BooleanLiteral")
    expect(formula.slice(cursor.from, cursor.to)).toBe("false")
    expect(cursor.nextSibling()).toBe(false)

    // supports CODAP `and` operator
    formula = "true and false"
    tree = parser.parse(formula)
    cursor = tree.cursor()
    expect(cursor.type.name).toBe("SingleExpression")
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("BinaryExpression")
    expect(formula.slice(cursor.from, cursor.to)).toBe(formula)
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("BooleanLiteral")
    expect(formula.slice(cursor.from, cursor.to)).toBe("true")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("LogicOp")
    expect(formula.slice(cursor.from, cursor.to)).toBe("and")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("BooleanLiteral")
    expect(formula.slice(cursor.from, cursor.to)).toBe("false")
    expect(cursor.nextSibling()).toBe(false)

    // supports CODAP `AND` operator
    formula = "true AND false"
    tree = parser.parse(formula)
    cursor = tree.cursor()
    expect(cursor.type.name).toBe("SingleExpression")
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("BinaryExpression")
    expect(formula.slice(cursor.from, cursor.to)).toBe(formula)
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("BooleanLiteral")
    expect(formula.slice(cursor.from, cursor.to)).toBe("true")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("LogicOp")
    expect(formula.slice(cursor.from, cursor.to)).toBe("AND")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("BooleanLiteral")
    expect(formula.slice(cursor.from, cursor.to)).toBe("false")
    expect(cursor.nextSibling()).toBe(false)

    // supports CODAP | operator
    formula = "true | false"
    tree = parser.parse(formula)
    cursor = tree.cursor()
    expect(cursor.type.name).toBe("SingleExpression")
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("BinaryExpression")
    expect(formula.slice(cursor.from, cursor.to)).toBe(formula)
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("BooleanLiteral")
    expect(formula.slice(cursor.from, cursor.to)).toBe("true")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("LogicOp")
    expect(formula.slice(cursor.from, cursor.to)).toBe("|")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("BooleanLiteral")
    expect(formula.slice(cursor.from, cursor.to)).toBe("false")
    expect(cursor.nextSibling()).toBe(false)

    // supports CODAP `or` operator
    formula = "true or false"
    tree = parser.parse(formula)
    cursor = tree.cursor()
    expect(cursor.type.name).toBe("SingleExpression")
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("BinaryExpression")
    expect(formula.slice(cursor.from, cursor.to)).toBe(formula)
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("BooleanLiteral")
    expect(formula.slice(cursor.from, cursor.to)).toBe("true")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("LogicOp")
    expect(formula.slice(cursor.from, cursor.to)).toBe("or")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("BooleanLiteral")
    expect(formula.slice(cursor.from, cursor.to)).toBe("false")
    expect(cursor.nextSibling()).toBe(false)

    // supports CODAP `OR` operator
    formula = "true OR false"
    tree = parser.parse(formula)
    cursor = tree.cursor()
    expect(cursor.type.name).toBe("SingleExpression")
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("BinaryExpression")
    expect(formula.slice(cursor.from, cursor.to)).toBe(formula)
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("BooleanLiteral")
    expect(formula.slice(cursor.from, cursor.to)).toBe("true")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("LogicOp")
    expect(formula.slice(cursor.from, cursor.to)).toBe("OR")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("BooleanLiteral")
    expect(formula.slice(cursor.from, cursor.to)).toBe("false")
    expect(cursor.nextSibling()).toBe(false)

    // doesn't support JavaScript && operator
    formula = "true && false"
    tree = parser.parse(formula)
    cursor = tree.cursor()
    expect(hasParseError(cursor)).toBe(true)

    // doesn't support JavaScript || operator
    formula = "true || false"
    tree = parser.parse(formula)
    cursor = tree.cursor()
    expect(hasParseError(cursor)).toBe(true)
  })

  it("handles equality comparison operators", () => {
    // supports CODAP = operator
    let formula = "1 = 2"
    let tree = parser.parse(formula)
    let cursor = tree.cursor()
    expect(cursor.type.name).toBe("SingleExpression")
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("BinaryExpression")
    expect(formula.slice(cursor.from, cursor.to)).toBe(formula)
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("Number")
    expect(formula.slice(cursor.from, cursor.to)).toBe("1")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("CompareOp")
    expect(formula.slice(cursor.from, cursor.to)).toBe("=")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("Number")
    expect(formula.slice(cursor.from, cursor.to)).toBe("2")
    expect(cursor.nextSibling()).toBe(false)

    // supports CODAP != operator
    formula = "1 != 2"
    tree = parser.parse(formula)
    cursor = tree.cursor()
    expect(cursor.type.name).toBe("SingleExpression")
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("BinaryExpression")
    expect(formula.slice(cursor.from, cursor.to)).toBe(formula)
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("Number")
    expect(formula.slice(cursor.from, cursor.to)).toBe("1")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("CompareOp")
    expect(formula.slice(cursor.from, cursor.to)).toBe("!=")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("Number")
    expect(formula.slice(cursor.from, cursor.to)).toBe("2")
    expect(cursor.nextSibling()).toBe(false)

    // supports CODAP != operator without spaces
    formula = "1!=2"
    tree = parser.parse(formula)
    cursor = tree.cursor()
    expect(cursor.type.name).toBe("SingleExpression")
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("BinaryExpression")
    expect(formula.slice(cursor.from, cursor.to)).toBe(formula)
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("Number")
    expect(formula.slice(cursor.from, cursor.to)).toBe("1")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("CompareOp")
    expect(formula.slice(cursor.from, cursor.to)).toBe("!=")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("Number")
    expect(formula.slice(cursor.from, cursor.to)).toBe("2")
    expect(cursor.nextSibling()).toBe(false)

    // supports CODAP ≠ operator
    formula = "1 ≠ 2"
    tree = parser.parse(formula)
    cursor = tree.cursor()
    expect(cursor.type.name).toBe("SingleExpression")
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("BinaryExpression")
    expect(formula.slice(cursor.from, cursor.to)).toBe(formula)
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("Number")
    expect(formula.slice(cursor.from, cursor.to)).toBe("1")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("CompareOp")
    expect(formula.slice(cursor.from, cursor.to)).toBe("≠")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("Number")
    expect(formula.slice(cursor.from, cursor.to)).toBe("2")
    expect(cursor.nextSibling()).toBe(false)

    // supports CODAP ≠ operator without spaces
    formula = "1≠2"
    tree = parser.parse(formula)
    cursor = tree.cursor()
    expect(cursor.type.name).toBe("SingleExpression")
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("BinaryExpression")
    expect(formula.slice(cursor.from, cursor.to)).toBe(formula)
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("Number")
    expect(formula.slice(cursor.from, cursor.to)).toBe("1")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("CompareOp")
    expect(formula.slice(cursor.from, cursor.to)).toBe("≠")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("Number")
    expect(formula.slice(cursor.from, cursor.to)).toBe("2")
    expect(cursor.nextSibling()).toBe(false)

    // supports JavaScript == operator
    formula = "1 == 2"
    tree = parser.parse(formula)
    cursor = tree.cursor()
    expect(hasParseError(cursor)).toBe(false)

    // doesn't support JavaScript === operator
    formula = "1 === 2"
    tree = parser.parse(formula)
    cursor = tree.cursor()
    expect(hasParseError(cursor)).toBe(true)

    // doesn't support JavaScript !== operator
    formula = "1 !== 2"
    tree = parser.parse(formula)
    cursor = tree.cursor()
    expect(hasParseError(cursor)).toBe(true)
  })

  it("handles relative comparison operators", () => {
    // supports < operator
    let formula = "1 < 2"
    let tree = parser.parse(formula)
    let cursor = tree.cursor()
    expect(cursor.type.name).toBe("SingleExpression")
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("BinaryExpression")
    expect(formula.slice(cursor.from, cursor.to)).toBe(formula)
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("Number")
    expect(formula.slice(cursor.from, cursor.to)).toBe("1")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("CompareOp")
    expect(formula.slice(cursor.from, cursor.to)).toBe("<")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("Number")
    expect(formula.slice(cursor.from, cursor.to)).toBe("2")
    expect(cursor.nextSibling()).toBe(false)

    // supports <= operator
    formula = "1 <= 2"
    tree = parser.parse(formula)
    cursor = tree.cursor()
    expect(cursor.type.name).toBe("SingleExpression")
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("BinaryExpression")
    expect(formula.slice(cursor.from, cursor.to)).toBe(formula)
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("Number")
    expect(formula.slice(cursor.from, cursor.to)).toBe("1")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("CompareOp")
    expect(formula.slice(cursor.from, cursor.to)).toBe("<=")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("Number")
    expect(formula.slice(cursor.from, cursor.to)).toBe("2")
    expect(cursor.nextSibling()).toBe(false)

    // supports <= operator without spaces
    formula = "1<=2"
    tree = parser.parse(formula)
    cursor = tree.cursor()
    expect(cursor.type.name).toBe("SingleExpression")
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("BinaryExpression")
    expect(formula.slice(cursor.from, cursor.to)).toBe(formula)
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("Number")
    expect(formula.slice(cursor.from, cursor.to)).toBe("1")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("CompareOp")
    expect(formula.slice(cursor.from, cursor.to)).toBe("<=")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("Number")
    expect(formula.slice(cursor.from, cursor.to)).toBe("2")
    expect(cursor.nextSibling()).toBe(false)

    // supports ≤ operator
    formula = "1 ≤ 2"
    tree = parser.parse(formula)
    cursor = tree.cursor()
    expect(cursor.type.name).toBe("SingleExpression")
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("BinaryExpression")
    expect(formula.slice(cursor.from, cursor.to)).toBe(formula)
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("Number")
    expect(formula.slice(cursor.from, cursor.to)).toBe("1")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("CompareOp")
    expect(formula.slice(cursor.from, cursor.to)).toBe("≤")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("Number")
    expect(formula.slice(cursor.from, cursor.to)).toBe("2")
    expect(cursor.nextSibling()).toBe(false)

    // supports ≤ operator without spaces
    formula = "1≤2"
    tree = parser.parse(formula)
    cursor = tree.cursor()
    expect(cursor.type.name).toBe("SingleExpression")
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("BinaryExpression")
    expect(formula.slice(cursor.from, cursor.to)).toBe(formula)
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("Number")
    expect(formula.slice(cursor.from, cursor.to)).toBe("1")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("CompareOp")
    expect(formula.slice(cursor.from, cursor.to)).toBe("≤")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("Number")
    expect(formula.slice(cursor.from, cursor.to)).toBe("2")
    expect(cursor.nextSibling()).toBe(false)

    // supports > operator
    formula = "1 > 2"
    tree = parser.parse(formula)
    cursor = tree.cursor()
    expect(cursor.type.name).toBe("SingleExpression")
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("BinaryExpression")
    expect(formula.slice(cursor.from, cursor.to)).toBe(formula)
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("Number")
    expect(formula.slice(cursor.from, cursor.to)).toBe("1")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("CompareOp")
    expect(formula.slice(cursor.from, cursor.to)).toBe(">")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("Number")
    expect(formula.slice(cursor.from, cursor.to)).toBe("2")
    expect(cursor.nextSibling()).toBe(false)

    // supports >= operator
    formula = "1 >= 2"
    tree = parser.parse(formula)
    cursor = tree.cursor()
    expect(cursor.type.name).toBe("SingleExpression")
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("BinaryExpression")
    expect(formula.slice(cursor.from, cursor.to)).toBe(formula)
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("Number")
    expect(formula.slice(cursor.from, cursor.to)).toBe("1")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("CompareOp")
    expect(formula.slice(cursor.from, cursor.to)).toBe(">=")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("Number")
    expect(formula.slice(cursor.from, cursor.to)).toBe("2")
    expect(cursor.nextSibling()).toBe(false)

    // supports >= operator without spaces
    formula = "1>=2"
    tree = parser.parse(formula)
    cursor = tree.cursor()
    expect(cursor.type.name).toBe("SingleExpression")
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("BinaryExpression")
    expect(formula.slice(cursor.from, cursor.to)).toBe(formula)
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("Number")
    expect(formula.slice(cursor.from, cursor.to)).toBe("1")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("CompareOp")
    expect(formula.slice(cursor.from, cursor.to)).toBe(">=")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("Number")
    expect(formula.slice(cursor.from, cursor.to)).toBe("2")
    expect(cursor.nextSibling()).toBe(false)

    // supports ≥ operator
    formula = "1 ≥ 2"
    tree = parser.parse(formula)
    cursor = tree.cursor()
    expect(cursor.type.name).toBe("SingleExpression")
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("BinaryExpression")
    expect(formula.slice(cursor.from, cursor.to)).toBe(formula)
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("Number")
    expect(formula.slice(cursor.from, cursor.to)).toBe("1")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("CompareOp")
    expect(formula.slice(cursor.from, cursor.to)).toBe("≥")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("Number")
    expect(formula.slice(cursor.from, cursor.to)).toBe("2")
    expect(cursor.nextSibling()).toBe(false)

    // supports ≥ operator without spaces
    formula = "1≥2"
    tree = parser.parse(formula)
    cursor = tree.cursor()
    expect(cursor.type.name).toBe("SingleExpression")
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("BinaryExpression")
    expect(formula.slice(cursor.from, cursor.to)).toBe(formula)
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("Number")
    expect(formula.slice(cursor.from, cursor.to)).toBe("1")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("CompareOp")
    expect(formula.slice(cursor.from, cursor.to)).toBe("≥")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("Number")
    expect(formula.slice(cursor.from, cursor.to)).toBe("2")
    expect(cursor.nextSibling()).toBe(false)
  })

  it("handles ternary operators", () => {
    let formula = "0 ? 1 : 2"
    let tree = parser.parse(formula)
    let cursor = tree.cursor()
    expect(cursor.type.name).toBe("SingleExpression")
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("ConditionalExpression")
    expect(formula.slice(cursor.from, cursor.to)).toBe(formula)
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("Number")
    expect(formula.slice(cursor.from, cursor.to)).toBe("0")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("LogicOp")
    expect(formula.slice(cursor.from, cursor.to)).toBe("?")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("Number")
    expect(formula.slice(cursor.from, cursor.to)).toBe("1")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("LogicOp")
    expect(formula.slice(cursor.from, cursor.to)).toBe(":")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("Number")
    expect(formula.slice(cursor.from, cursor.to)).toBe("2")
    expect(cursor.nextSibling()).toBe(false)
  })

  it("handles identifiers and functions", () => {
    // supports identifiers
    let formula = "foo"
    let tree = parser.parse(formula)
    let cursor = tree.cursor()
    expect(cursor.type.name).toBe("SingleExpression")
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("VariableName")
    expect(formula.slice(cursor.from, cursor.to)).toBe("foo")
    expect(cursor.nextSibling()).toBe(false)

    // supports backtick identifiers
    formula = "`foo`"
    tree = parser.parse(formula)
    cursor = tree.cursor()
    expect(cursor.type.name).toBe("SingleExpression")
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("VariableName")
    expect(formula.slice(cursor.from, cursor.to)).toBe("`foo`")
    expect(cursor.nextSibling()).toBe(false)

    // supports backtick identifiers with embedded quotes
    formula = "`\"foo\"`"
    tree = parser.parse(formula)
    cursor = tree.cursor()
    expect(cursor.type.name).toBe("SingleExpression")
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("VariableName")
    expect(formula.slice(cursor.from, cursor.to)).toBe("`\"foo\"`")
    expect(cursor.nextSibling()).toBe(false)

    // supports functions
    formula = `fn(1, "foo", bar)`
    tree = parser.parse(formula)
    cursor = tree.cursor()
    traverseCursor(formula, cursor)
    expect(cursor.type.name).toBe("SingleExpression")
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("CallExpression")
    expect(formula.slice(cursor.from, cursor.to)).toBe(formula)
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("FunctionName")
    expect(formula.slice(cursor.from, cursor.to)).toBe("fn")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("ArgList")
    expect(formula.slice(cursor.from, cursor.to)).toBe(`(1, "foo", bar)`)
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("(")
    expect(formula.slice(cursor.from, cursor.to)).toBe("(")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("Number")
    expect(formula.slice(cursor.from, cursor.to)).toBe("1")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("String")
    expect(formula.slice(cursor.from, cursor.to)).toBe(`"foo"`)
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("VariableName")
    expect(formula.slice(cursor.from, cursor.to)).toBe("bar")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe(")")
    expect(formula.slice(cursor.from, cursor.to)).toBe(")")

    // can have spaces between function name and args list
    formula = `fn (1, "foo", bar)`
    tree = parser.parse(formula)
    cursor = tree.cursor()
    traverseCursor(formula, cursor)
    expect(cursor.type.name).toBe("SingleExpression")
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("CallExpression")
    expect(formula.slice(cursor.from, cursor.to)).toBe(formula)
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("FunctionName")
    expect(formula.slice(cursor.from, cursor.to)).toBe("fn")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("ArgList")
    expect(formula.slice(cursor.from, cursor.to)).toBe(`(1, "foo", bar)`)
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("(")
    expect(formula.slice(cursor.from, cursor.to)).toBe("(")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("Number")
    expect(formula.slice(cursor.from, cursor.to)).toBe("1")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("String")
    expect(formula.slice(cursor.from, cursor.to)).toBe(`"foo"`)
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("VariableName")
    expect(formula.slice(cursor.from, cursor.to)).toBe("bar")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe(")")
    expect(formula.slice(cursor.from, cursor.to)).toBe(")")
  })

  it("handles comments", () => {
    // supports line comments
    let formula = "1 // numeric literal"
    let tree = parser.parse(formula)
    let cursor = tree.cursor()
    expect(cursor.type.name).toBe("SingleExpression")
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("Number")
    expect(formula.slice(cursor.from, cursor.to)).toBe("1")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("LineComment")
    expect(formula.slice(cursor.from, cursor.to)).toBe("// numeric literal")
    expect(cursor.nextSibling()).toBe(false)

    // supports block comments
    formula = "1 + /* comment */ 2"
    tree = parser.parse(formula)
    cursor = tree.cursor()
    expect(cursor.type.name).toBe("SingleExpression")
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("BinaryExpression")
    expect(formula.slice(cursor.from, cursor.to)).toBe(formula)
    expect(cursor.firstChild()).toBe(true)
    expect(cursor.type.name).toBe("Number")
    expect(formula.slice(cursor.from, cursor.to)).toBe("1")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("ArithOp")
    expect(formula.slice(cursor.from, cursor.to)).toBe("+")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("BlockComment")
    expect(formula.slice(cursor.from, cursor.to)).toBe("/* comment */")
    expect(cursor.nextSibling()).toBe(true)
    expect(cursor.type.name).toBe("Number")
    expect(formula.slice(cursor.from, cursor.to)).toBe("2")
    expect(cursor.nextSibling()).toBe(false)
  })
})
