import { IAnyStateTreeNode } from "mobx-state-tree"
import React, { Key, useEffect, useRef, useState } from "react"
import { Menu, MenuItem, MenuSection, Separator } from "react-aria-components"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { boundaryManager } from "../../models/boundaries/boundary-manager"
import { getSharedModelManager } from "../../models/tiles/tile-environment"
import { getGlobalValueManager } from "../../models/global/global-value-manager"
import { useFormulaEditorContext } from "./formula-editor-context"

import "./formula-insert-menus.scss"

const kMenuGap = 3
const kMaxHeight = 470

interface IProps {
  buttonRef: React.RefObject<HTMLButtonElement | null>
  onClose: () => void
}

function getGlobalsNames(node?: IAnyStateTreeNode) {
  const globalManager = node && getGlobalValueManager(getSharedModelManager(node))
  return globalManager ? Array.from(globalManager.globals.values()).map(global => global.name) : []
}

export const InsertValuesMenu = ({ buttonRef, onClose }: IProps) => {
  const dataSet = useDataSetContext()
  const { editorApi } = useFormulaEditorContext()
  const collections = dataSet?.collections
  const attributeNamesInCollection = collections?.map(collection =>
    collection.attributes
      .map(attr => attr?.name)
      .filter(name => name !== undefined)
  )
  const attributeNames = dataSet?.attributes.map(attr => attr.name)
  const globalsNames = getGlobalsNames(dataSet)
  const constants = ["e", "false", "true", "π"]
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollableContainerRef = useRef<HTMLDivElement>(null)
  const [, setScrollPosition] = useState(0)

  const insertValueToFormula = (value: string) => {
    // if the name begins with a digit or has any non-alphanumeric chars, wrap it in backticks
    if (/^\d|[^\w]/.test(value)) value = `\`${value}\``
    editorApi?.insertVariableString(value)
    onClose()
  }

  const handleAction = (key: Key) => {
    // strip the category prefix (e.g. "attr:", "const:") to get the actual value
    const value = String(key).replace(/^[^:]+:/, "")
    insertValueToFormula(value)
  }

  function getListContainerStyle() {
    // calculate the top of the list container based on the height of the list. The list should be
    // nearly centered on the button that opens it.
    // The list should not extend beyond the top or bottom of the window.
    const listEl = containerRef.current
    const button = buttonRef.current

    const allNames = [...(attributeNames ?? []), ...boundaryManager.boundaryKeys, ...globalsNames]
    const maxItemLength = allNames.length > 0 ? Math.max(...allNames.map(n => n.length)) : 0

    let top = 0
    if (button && listEl) {
      const buttonRect = button.getBoundingClientRect()
      const buttonBottom = buttonRect.bottom || 0
      const listHeight = listEl.offsetHeight || 0
      const spaceBelow = window.innerHeight - buttonBottom

      if (spaceBelow >= listHeight) {
        top = buttonRect.height + kMenuGap
      } else {
        top = spaceBelow - listHeight
      }
      return { top, height: kMaxHeight, width: 40 + 10 * maxItemLength }
    }
    return {}
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" || e.key === "Tab") {
      onClose()
      e.preventDefault()
      e.stopPropagation()
    }
  }

  const handleScroll = (direction: "up" | "down") => {
    const container = scrollableContainerRef.current
    if (container) {
      if (direction === "up") {
        container.scrollTo({ top: 0, behavior: "smooth" })
      } else {
        container.scrollTo({ top: container.scrollHeight, behavior: "smooth" })
      }
    }
  }

  useEffect(() => {
    const handleScrollPosition = () => {
      if (scrollableContainerRef.current) {
        setScrollPosition(scrollableContainerRef.current.scrollTop)
      }
    }

    // Focus the first menu item on mount so arrow key navigation works.
    // react-aria's Menu autoFocus doesn't move DOM focus in standalone mode (no MenuTrigger/Popover),
    // so we do it manually. The requestAnimationFrame delay ensures we run after Chakra Modal's
    // focus trapping has settled.
    const rafId = requestAnimationFrame(() => {
      const firstItem = scrollableContainerRef.current?.querySelector('[role="menuitem"]') as HTMLElement
      firstItem?.focus()
    })

    const container = scrollableContainerRef.current
    container?.addEventListener("scroll", handleScrollPosition)

    return () => {
      cancelAnimationFrame(rafId)
      container?.removeEventListener("scroll", handleScrollPosition)
    }
  }, [])

  const isScrollable = scrollableContainerRef.current && scrollableContainerRef.current.scrollHeight > kMaxHeight
  const canScrollUp = scrollableContainerRef.current && scrollableContainerRef.current.scrollTop > 0
  const canScrollDown = scrollableContainerRef.current &&
          (scrollableContainerRef.current.scrollHeight - scrollableContainerRef.current.scrollTop + 20 > kMaxHeight)

  return (
    <div ref={containerRef} className="formula-operand-list-container" data-testid="formula-value-list"
        style={getListContainerStyle()} onKeyDown={handleKeyDown}>
      { isScrollable && canScrollUp &&
        <div className="scroll-arrow" aria-hidden="true" onPointerOver={() => handleScroll("up")}>
          <span>▲</span>
        </div>
      }
      <Menu ref={scrollableContainerRef} aria-label="Insert value" onAction={handleAction}
            className="formula-operand-scrollable-container">
        { collections?.map((collection, index) => {
          return (
            <React.Fragment key={collection.id}>
              {index > 0 && <Separator className="list-divider" />}
              <MenuSection className="formula-operand-subset" aria-label={collection.name}>
                { attributeNamesInCollection?.[index]?.map((attrName) => {
                  return (
                    <MenuItem key={attrName} id={`attr:${attrName}`} textValue={attrName}
                        className="formula-operand-list-item" data-testid="formula-value-item">
                      <span>{attrName}</span>
                    </MenuItem>
                  )
                })}
              </MenuSection>
            </React.Fragment>
          )
        })}
        <Separator className="list-divider" />
        <MenuSection className="formula-operand-subset" aria-label="Special">
          <MenuItem id="special:caseIndex" textValue="caseIndex" className="formula-operand-list-item"
                data-testid="formula-operand-case-index">
            <span>caseIndex</span>
          </MenuItem>
        </MenuSection>
        <Separator className="list-divider" />
        <MenuSection className="formula-operand-subset" aria-label="Boundaries and globals">
          { boundaryManager.boundaryKeys.map((boundary, index) => {
            return (
              <MenuItem key={boundary} id={`boundary:${boundary}`} textValue={boundary}
                    data-testid={`formula-operand-boundary-${index}`}
                    className="formula-operand-list-item">
                <span>{boundary}</span>
              </MenuItem>
            )
          })}
          { globalsNames.map((globalName, index) => {
            return (
              <MenuItem key={globalName} id={`global:${globalName}`} textValue={globalName}
                    data-testid={`formula-operand-global-${index}`}
                    className="formula-operand-list-item">
                <span>{globalName}</span>
              </MenuItem>
            )
          })}
        </MenuSection>
        <Separator className="list-divider" />
        <MenuSection className="formula-operand-subset" aria-label="Constants">
          {constants.map((constant, index) => (
            <MenuItem key={constant} id={`const:${constant}`} textValue={constant}
                      data-testid={`formula-operand-constant-${index}`}
                      className="formula-operand-list-item">
              <span>{constant}</span>
            </MenuItem>
          ))}
        </MenuSection>
      </Menu>
      { isScrollable && canScrollDown &&
        <div className="scroll-arrow" aria-hidden="true" onPointerOver={() => handleScroll("down")}>
          <span>▼</span>
        </div>
      }
    </div>
  )
}
