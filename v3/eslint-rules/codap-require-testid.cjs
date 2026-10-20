// ESLint rule: codap/require-testid
// Requires data-testid on interactive / semantic UI elements under v3/src/components/**.
// Also validates shape (lowercase kebab-case) of statically-resolvable data-testid / data-role values.
// Namespace imports (e.g. `import * as Chakra from "@chakra-ui/react"` + `<Chakra.MenuList>`)
// are not currently handled — use named imports.

const TARGET_NATIVE = new Set(["button", "input", "select", "textarea"])
const TARGET_CHAKRA = new Set(["MenuList", "MenuItem", "MenuButton", "ModalContent"])
const TARGET_RA = new Set(["Button", "MenuItem", "Tab", "TabPanel", "Dialog", "Popover"])
const CHAKRA_SOURCE = "@chakra-ui/react"
const RA_SOURCE = "react-aria-components"
const KEBAB_RE = /^[a-z][a-z0-9-]*$/

function getAttr(node, name) {
  return node.attributes.find(a =>
    a.type === "JSXAttribute" && a.name && a.name.type === "JSXIdentifier" && a.name.name === name)
}

function getStaticStringValue(attr) {
  if (!attr || !attr.value) return { present: true, value: null, statik: false }
  const v = attr.value
  if (v.type === "Literal" && typeof v.value === "string") {
    return { present: true, value: v.value, statik: true }
  }
  if (v.type === "JSXExpressionContainer") {
    const expr = v.expression
    if (expr.type === "Literal" && typeof expr.value === "string") {
      return { present: true, value: expr.value, statik: true }
    }
    if (expr.type === "ConditionalExpression" &&
        expr.consequent.type === "Literal" && typeof expr.consequent.value === "string" &&
        expr.alternate.type === "Literal" && typeof expr.alternate.value === "string") {
      return { present: true, value: [expr.consequent.value, expr.alternate.value], statik: true, ternary: true }
    }
    return { present: true, value: null, statik: false }
  }
  return { present: true, value: null, statik: false }
}

function getClassName(node) {
  const classAttr = getAttr(node, "className")
  if (!classAttr || !classAttr.value) return ""
  const v = classAttr.value
  if (v.type === "Literal" && typeof v.value === "string") return v.value
  if (v.type === "JSXExpressionContainer" && v.expression.type === "Literal"
      && typeof v.expression.value === "string") {
    return v.expression.value
  }
  return ""
}

function ariaHiddenTrue(node) {
  const attr = getAttr(node, "aria-hidden")
  if (!attr) return false
  const s = getStaticStringValue(attr)
  if (s.statik && typeof s.value === "string") return s.value === "true"
  // dynamic — assume not aria-hidden
  return false
}

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Require data-testid on interactive / semantic UI elements; validate data-testid and data-role kebab-case"
    },
    messages: {
      missingTestId: "Missing data-testid on <{{name}}>",
      invalidTestIdShape: "data-testid must be lowercase kebab-case (got {{value}})",
      invalidRoleShape: "data-role must be lowercase kebab-case (got {{value}})"
    },
    schema: []
  },
  create(context) {
    // Map local binding name -> source module
    const importOrigins = new Map()

    function isChakraTarget(localName) {
      return TARGET_CHAKRA.has(localName) && importOrigins.get(localName) === CHAKRA_SOURCE
    }
    function isRATarget(localName) {
      return TARGET_RA.has(localName) && importOrigins.get(localName) === RA_SOURCE
    }

    function nodeName(node) {
      if (node.name.type === "JSXIdentifier") return node.name.name
      return null
    }

    function isTargetElement(node) {
      const name = nodeName(node)
      if (!name) return false

      // Skip: aria-hidden="true"
      if (ariaHiddenTrue(node)) return false

      // Skip: ModalOverlay
      if (name === "ModalOverlay") return false

      // Skip: className contains "separator"
      const className = getClassName(node)
      if (className && /\bseparator\b/i.test(className)) return false

      // Native interactive
      if (TARGET_NATIVE.has(name)) return true

      // Chakra / React-Aria imports
      if (isChakraTarget(name)) return true
      if (isRATarget(name)) return true

      // Anchor: onClick, role="button", or non-empty href
      if (name === "a") {
        const onClick = getAttr(node, "onClick")
        if (onClick) return true
        const role = getAttr(node, "role")
        if (role) {
          const r = getStaticStringValue(role)
          if (r.statik && r.value === "button") return true
        }
        const href = getAttr(node, "href")
        if (href) {
          const h = getStaticStringValue(href)
          if (h.statik && typeof h.value === "string" && h.value !== "") return true
          // dynamic href — treat as interactive
          if (!h.statik) return true
        }
        return false
      }

      // Div with className matching dialog/panel/modal- or containing menuItem (case-insensitive)
      if (name === "div") {
        if (!className) return false
        if (/-dialog$|-panel$|modal-/.test(className)) return true
        if (/menuItem/i.test(className)) return true
        return false
      }

      return false
    }

    function checkShape(node, attrName, messageId, value) {
      const bad = v => typeof v === "string" && !KEBAB_RE.test(v)
      if (Array.isArray(value)) {
        const badOne = value.find(bad)
        if (badOne != null) {
          context.report({ node, messageId, data: { value: badOne } })
        }
      } else if (bad(value)) {
        context.report({ node, messageId, data: { value } })
      }
    }

    return {
      ImportDeclaration(node) {
        const src = node.source && node.source.value
        if (src !== CHAKRA_SOURCE && src !== RA_SOURCE) return
        for (const spec of node.specifiers) {
          if (spec.type === "ImportSpecifier" && spec.local && spec.local.name) {
            importOrigins.set(spec.local.name, src)
          }
        }
      },

      JSXOpeningElement(node) {
        // Shape-check data-role on ANY element (target or not)
        const roleAttr = getAttr(node, "data-role")
        if (roleAttr) {
          const r = getStaticStringValue(roleAttr)
          if (r.statik && r.value != null) {
            checkShape(node, "data-role", "invalidRoleShape", r.value)
          }
        }

        if (!isTargetElement(node)) return

        const testIdAttr = getAttr(node, "data-testid")
        if (!testIdAttr) {
          const name = nodeName(node) ?? "unknown"
          context.report({ node, messageId: "missingTestId", data: { name } })
          return
        }
        const t = getStaticStringValue(testIdAttr)
        if (t.statik && t.value != null) {
          checkShape(node, "data-testid", "invalidTestIdShape", t.value)
        }
      }
    }
  }
}
