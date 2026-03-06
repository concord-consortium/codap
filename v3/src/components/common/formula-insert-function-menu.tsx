import React, { Key, useCallback, useEffect, useRef, useState } from "react"
import { Menu, MenuItem } from "react-aria-components"

import { functionCategoryInfoArray, FunctionInfo } from "../../lib/functions"
import { useFormulaEditorContext } from "./formula-editor-context"

import "./formula-insert-menus.scss"

const kMenuGap = 3
const kMaxMenuHeight = 380  // matches max-height in formula-insert-menus.scss

// Focus a menu item by data-name, or fall back to the first menu item
function focusMenuItemByName(container: HTMLElement, name: string) {
  const target = name
    ? container.querySelector(`[data-name="${CSS.escape(name)}"]`) as HTMLElement
    : container.querySelector('[role="menuitem"]') as HTMLElement
  target?.focus()
}

interface IProps {
  buttonRef: React.RefObject<HTMLButtonElement | null>
  onClose: () => void
}

export const InsertFunctionMenu = ({ buttonRef, onClose }: IProps) => {
  const { editorApi } = useFormulaEditorContext()
  const [functionMenuView, setFunctionMenuView] = useState<"category" | "list" | "info">("category")
  const [selectedCategory, setSelectedCategory] = useState("")
  const [selectedFunction, setSelectedFunction] = useState("")
  const [menuPosition, setMenuPosition] = useState<React.CSSProperties>({})
  const containerRef = useRef<HTMLDivElement>(null)
  // Track last-focused keys for restoring focus on back navigation
  const lastFocusedCategoryRef = useRef("")
  const lastFocusedFunctionRef = useRef("")

  const getFunctionMenuPosition = useCallback((): React.CSSProperties => {
    const buttonEl = buttonRef.current

    if (buttonEl) {
      const buttonRect = buttonEl.getBoundingClientRect()
      // Calculate available space above and below the button to determine where to position the menu
      const spaceBelow = window.innerHeight - buttonRect.bottom
      const spaceAbove = buttonRect.top
      if (spaceBelow < kMaxMenuHeight && spaceAbove >= kMaxMenuHeight) {
        return { bottom: buttonRect.height + kMenuGap }
      }
      return { top: buttonRect.height + kMenuGap }
    }
    return {}
  }, [buttonRef])

  useEffect(() => {
    setMenuPosition(getFunctionMenuPosition())
  }, [getFunctionMenuPosition])

  // Focus management when views change
  useEffect(() => {
    const rafId = requestAnimationFrame(() => {
      if (!containerRef.current) return

      if (functionMenuView === "category" || functionMenuView === "list") {
        // Restore focus to the last-focused item in this view, or fall back to first item
        const lastFocused = functionMenuView === "category"
          ? lastFocusedCategoryRef.current
          : lastFocusedFunctionRef.current
        focusMenuItemByName(containerRef.current, lastFocused)
      } else {
        // Info view: focus the function name (the insertable element)
        const funcNameEl = containerRef.current.querySelector('.function-info-name') as HTMLElement
        funcNameEl?.focus()
      }
    })
    return () => cancelAnimationFrame(rafId)
  }, [functionMenuView])

  const insertFunctionString = useCallback((functionInfo?: FunctionInfo) => {
    const { displayName = "", args = [] } = functionInfo || {}
    const argsString = args.map(arg => arg.name).join(", ") || ""
    const functionStr = `${displayName}(${argsString})`
    editorApi?.insertFunctionString(functionStr)
    onClose()
  }, [editorApi, onClose])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Tab") {
      const backButton = containerRef.current?.querySelector('.functions-list-header') as HTMLElement
      if (e.shiftKey && backButton && document.activeElement !== backButton) {
        // Shift+Tab from menu items → focus back button
        backButton.focus()
        e.preventDefault()
        e.stopPropagation()
        return
      }
      if (!e.shiftKey && document.activeElement === backButton) {
        // Tab from back button → focus first menu item
        const firstItem = containerRef.current?.querySelector('[role="menuitem"]') as HTMLElement
        firstItem?.focus()
        e.preventDefault()
        e.stopPropagation()
        return
      }
      // All other Tab cases → close menu
      onClose()
      e.preventDefault()
      e.stopPropagation()
      return
    }

    if (e.key === "Escape") {
      if (functionMenuView === "info") {
        setFunctionMenuView("list")
      } else if (functionMenuView === "list") {
        setFunctionMenuView("category")
      } else {
        onClose()
      }
      e.preventDefault()
      e.stopPropagation()
      return
    }

    // Left Arrow navigates back (list→categories, info→list)
    if (e.key === "ArrowLeft") {
      if (functionMenuView === "info") {
        setFunctionMenuView("list")
        e.preventDefault()
        e.stopPropagation()
      } else if (functionMenuView === "list") {
        setFunctionMenuView("category")
        e.preventDefault()
        e.stopPropagation()
      }
      return
    }

    // Right Arrow navigates forward (list→info for focused function)
    if (e.key === "ArrowRight" && functionMenuView === "list") {
      const focused = containerRef.current?.querySelector('[role="menuitem"][data-focused]') as HTMLElement
      const funcName = focused?.dataset.name
      if (funcName) {
        lastFocusedFunctionRef.current = funcName
        setSelectedFunction(funcName)
        setFunctionMenuView("info")
        e.preventDefault()
        e.stopPropagation()
      }
    }
  }

  const handleSelectCategory = (key: Key) => {
    const categoryKey = String(key)
    lastFocusedCategoryRef.current = categoryKey
    setSelectedCategory(categoryKey)
    lastFocusedFunctionRef.current = ""
    setFunctionMenuView("list")
  }

  const handleBack = (view: "category" | "list") => (e: React.MouseEvent) => {
    e.stopPropagation()
    setFunctionMenuView(view)
  }

  const renderFunctionCategoryList = () => {
    return (
      <Menu aria-label="Function categories" onAction={handleSelectCategory}
            className="formula-function-list" data-testid="formula-function-category-list">
        {functionCategoryInfoArray.map((category) => (
          <MenuItem key={category.category} id={category.category} textValue={category.displayName}
                    className="function-category-list-item" data-testid="formula-function-category-item"
                    data-name={category.category}>
            <span>{`${category.displayName} Functions`}</span>
            <span className="function-category-expand-arrow">&gt;</span>
          </MenuItem>
        ))}
      </Menu>
    )
  }

  const renderFunctionList = () => {
    const categoryObj = functionCategoryInfoArray.find(c => c.category === selectedCategory)
    if (!categoryObj) return null

    const handleInsertFunction = (key: Key) => {
      const func = categoryObj.functions.find(f => f.displayName === String(key))
      insertFunctionString(func)
    }

    const handleInfoClick = (funcName: string, e: React.MouseEvent) => {
      e.stopPropagation()
      lastFocusedFunctionRef.current = funcName
      setSelectedFunction(funcName)
      setFunctionMenuView("info")
    }

    return (
      <div className="formula-function-list" data-testid="formula-function-list">
        <button className="functions-list-header" onClick={handleBack("category")}
              aria-label="Back to categories" data-testid="formula-function-list-header">
          <span className="function-select-back-arrow">&lt; </span>
          <span>Categories</span>
          <span className="function-selected-item-name-header">{`${categoryObj.displayName} Functions`}</span>
        </button>
        <hr className="function-header-divider" />
        <Menu aria-label={`${categoryObj.displayName} functions`} onAction={handleInsertFunction}>
          {categoryObj.functions.map((func) => (
            <MenuItem key={func.displayName} id={func.displayName} textValue={func.displayName}
                      className="function-menu-item" data-testid="function-menu-item"
                      data-name={func.displayName}>
              <span className="function-menu-name">
                {func.displayName}
                (<span className="function-arguments">{func.args.map(arg => arg.name).join(", ")}</span>)
              </span>
              <button className="function-info-button" tabIndex={-1}
                      aria-label={`Info for ${func.displayName}`}
                      data-testid={`function-info-button-${func.displayName}`}
                      onClick={(e) => handleInfoClick(func.displayName, e)}>
                ⓘ
              </button>
            </MenuItem>
          ))}
        </Menu>
      </div>
    )
  }

  const renderFunctionInfo = () => {
    const functionCategoryObj = functionCategoryInfoArray.find((category) =>
      category.functions.some((func) => func.displayName === selectedFunction))
    const functionObj = functionCategoryObj?.functions.find(
      (func) => func.displayName === selectedFunction)

    return (
      <div className="formula-function-list" role="region"
            aria-label={`Function info for ${functionObj?.displayName}`}
            data-testid="formula-function-info">
        <button className="functions-list-header" onClick={handleBack("list")}
              aria-label={`Back to ${functionCategoryObj?.displayName} functions`}
              data-testid="formula-function-info-header">
          <span className="function-select-back-arrow">&lt; </span>
          <span className="function-categories-header">{`${functionCategoryObj?.displayName} Functions`}</span>
          <span className="function-selected-item-name-header">{`${functionObj?.displayName}`}</span>
        </button>
        <hr className="function-header-divider" />
        <div className="function-info-body">
          <button className="function-info-name"
                data-testid="function-info-name"
                aria-label={`Insert ${functionObj?.displayName}(${functionObj?.args.map(a => a.name).join(", ")})`}
                onClick={() => insertFunctionString(functionObj)}>
            <span>
              {functionObj?.displayName}
              (<span className="function-arguments">{functionObj?.args.map((arg) => arg.name).join(", ")}</span>)
            </span>
          </button>
          <div>{functionObj?.description}</div>
          <div className="function-info-subtitle">Parameters</div>
          {functionObj?.args.map((arg) => {
            return (
              <div className="function-arguments-info" key={arg.name}>
                <span>{arg.name}:</span>
                <span>{arg.description}</span>
                <span className="function-arguments">{arg.optional ? "(optional)" : "(required)"}</span>
              </div>
            )
          })}
          <div className="function-info-subtitle">Examples</div>
          {functionObj?.examples.map((example) => {
            return (
              <div key={example}>
                <span>{example}</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="formula-function-menu-container" style={menuPosition}
          onKeyDown={handleKeyDown}>
      { functionMenuView === "info"
          ? renderFunctionInfo()
          : functionMenuView === "list"
            ? renderFunctionList()
            : renderFunctionCategoryList()}
    </div>
  )
}
