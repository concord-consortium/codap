// jsdom doesn't provide structuredClone, but ESLint's RuleTester needs it.
if (typeof (globalThis as any).structuredClone !== "function") {
  (globalThis as any).structuredClone = (v: any) => JSON.parse(JSON.stringify(v))
}

import { RuleTester } from "eslint"
import tsParser from "@typescript-eslint/parser"
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const codapRequireTestid = require("./codap-require-testid.cjs")

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      ecmaFeatures: { jsx: true }
    }
  }
})

ruleTester.run("codap/require-testid", codapRequireTestid, {
  valid: [
    // Native with valid testid
    { code: `const a = <button data-testid="foo-bar" />` },
    { code: `const a = <input data-testid="foo-bar" />` },
    // Chakra MenuList imported from @chakra-ui/react
    {
      code: `import { MenuList } from "@chakra-ui/react"
const a = <MenuList data-testid="foo-bar" />`
    },
    // Same-name MenuList from a local module — NOT flagged
    {
      code: `import { MenuList } from "./local-menu"
const a = <MenuList />`
    },
    // React-Aria Dialog with testid
    {
      code: `import { Dialog } from "react-aria-components"
const a = <Dialog data-testid="foo-bar" />`
    },
    // Anchor without onClick/role/href → not flagged
    { code: `const a = <a>text</a>` },
    { code: `const a = <a href="" />` },
    // Unrelated div → not flagged
    { code: `const a = <div className="unrelated" />` },
    // aria-hidden skip
    { code: `const a = <button aria-hidden="true" />` },
    // separator skip
    { code: `const a = <button className="menu-separator" />` },
    // ModalOverlay skip
    { code: `const a = <ModalOverlay />` },
    // Dynamic data-testid → trust by presence
    { code: `const a = <button data-testid={x} />` },
    { code: "const a = <button data-testid={`foo-${x}`} />" },
    // Ternary both kebab
    { code: `const a = <button data-testid={x ? "foo-a" : "foo-b"} />` },
    // data-role valid kebab
    { code: `const a = <div data-role="axis-drag-rect" />` },
    // data-role absence on non-target — fine
    { code: `const a = <svg />` },
  ],
  invalid: [
    // Native button missing
    { code: `const a = <button />`, errors: [{ messageId: "missingTestId" }] },
    { code: `const a = <input />`, errors: [{ messageId: "missingTestId" }] },
    // Chakra MenuList missing
    {
      code: `import { MenuList } from "@chakra-ui/react"
const a = <MenuList />`,
      errors: [{ messageId: "missingTestId" }]
    },
    // React-Aria Popover missing
    {
      code: `import { Popover } from "react-aria-components"
const a = <Popover />`,
      errors: [{ messageId: "missingTestId" }]
    },
    // Anchor branches
    { code: `const a = <a href="#" />`, errors: [{ messageId: "missingTestId" }] },
    { code: `const a = <a onClick={fn} />`, errors: [{ messageId: "missingTestId" }] },
    { code: `const a = <a role="button" />`, errors: [{ messageId: "missingTestId" }] },
    // Dialog / panel className branch
    { code: `const a = <div className="foo-dialog" />`, errors: [{ messageId: "missingTestId" }] },
    { code: `const a = <div className="side-panel" />`, errors: [{ messageId: "missingTestId" }] },
    { code: `const a = <div className="modal-header" />`, errors: [{ messageId: "missingTestId" }] },
    // MenuItem-className branch
    { code: `const a = <div className="menuItem" />`, errors: [{ messageId: "missingTestId" }] },
    { code: `const a = <div className="fooMenuItemWrapper" />`, errors: [{ messageId: "missingTestId" }] },
    // Kebab-case shape invalid
    {
      code: `const a = <button data-testid="FooBar" />`,
      errors: [{ messageId: "invalidTestIdShape" }]
    },
    {
      code: `const a = <button data-testid="foo_bar" />`,
      errors: [{ messageId: "invalidTestIdShape" }]
    },
    {
      code: `const a = <button data-testid="foo bar" />`,
      errors: [{ messageId: "invalidTestIdShape" }]
    },
    // Ternary with one bad branch
    {
      code: `const a = <button data-testid={x ? "foo-a" : "FooB"} />`,
      errors: [{ messageId: "invalidTestIdShape" }]
    },
    // data-role shape
    {
      code: `const a = <div data-role="Axis Drag Rect" />`,
      errors: [{ messageId: "invalidRoleShape" }]
    },
    {
      code: `const a = <div data-role="axis_drag" />`,
      errors: [{ messageId: "invalidRoleShape" }]
    },
    // data-role on a non-target element — still shape-checked
    {
      code: `const a = <span data-role="Bad Role" />`,
      errors: [{ messageId: "invalidRoleShape" }]
    }
  ]
})
