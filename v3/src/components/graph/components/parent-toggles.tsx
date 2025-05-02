import React, { useCallback, useEffect, useRef, useState } from "react"
import { observer } from "mobx-react-lite"
import { t } from "../../../utilities/translation/translate"
import { useGraphDataConfigurationContext } from "../hooks/use-graph-data-configuration-context"
import { useGraphLayoutContext } from "../hooks/use-graph-layout-context"
import { useGraphContentModelContext } from "../hooks/use-graph-content-model-context"
import { measureText } from "../../../hooks/use-measure-text"
import { IDataSet } from "../../../models/data/data-set"
import LeftArrowIcon from "../assets/arrow_left.svg"
import RightArrowIcon from "../assets/arrow_right.svg"

import "./parent-toggles.scss"

interface ICaseButton {
  ids: string[]
  isHidden: boolean
  textLabel?: string
  width: number
}

interface ICreateCaseButtons {
  itemIDs: string[]
  dataset?: IDataSet
  collectionIndexForPrimaryAttribute: number
  hiddenCases: string[]
  isCollectionSet: boolean
  lastVisibleIndex: React.MutableRefObject<number>
}

const SCROLL_BUTTON_WIDTH = 32
const TEXT_OFFSET = 5
const BUTTON_FONT = "11px Montserrat, sans-serif"

const consolidateCaseButtonsByAttrValue = (caseButtons: ICaseButton[], hiddenCases: string[]): ICaseButton[] => {
  // Use caseButtons to create a map of attribute values to matching case IDs
  const attrValues = caseButtons.reduce((acc: { [key: string]: string[] }, button) => {
    const key = button.textLabel ?? ""
    acc[key] = acc[key] || []
    acc[key] = [...button.ids, ...acc[key]]
    return acc
  }, {})

  // Return a consolidated collection of buttons with the attribute values as their text
  return Object.entries(attrValues).map(([key, ids]) => {
    const textLabel = key
    const isHidden = ids.every(id => hiddenCases.includes(id))
    const width = measureText(textLabel, BUTTON_FONT)
    return { ids, textLabel, isHidden, width }
  })
}

const createCaseButtons = (props: ICreateCaseButtons): ICaseButton[] => {
  const { itemIDs, dataset, collectionIndexForPrimaryAttribute, isCollectionSet,
    hiddenCases, lastVisibleIndex } = props
  if (!dataset) return []

  // Determine the attribute to use for setting the buttons' text labels.
  const firstAttrId = isCollectionSet
                        ? dataset.collections[0].attributes[0]?.id
                        : dataset.attributes[0].id

  const caseButtons = itemIDs.map((itemID) => {
    // Buttons start off associated with a single case but can potentially be associated with multiple cases if a
    // parent collection is set. When a collection is set, the association with multiple cases will be made
    // in `consolidateCaseButtonsByAttrValue`.
    const childCaseIDs = isCollectionSet ? dataset.getItemCaseIds(itemID) ?? '' : [itemID]
    const childCaseID = childCaseIDs[collectionIndexForPrimaryAttribute]
    const ids = [childCaseID]
    const textLabel = firstAttrId && dataset?.getStrValue(itemID, firstAttrId)
    const width = textLabel ? measureText(textLabel, BUTTON_FONT) : 0
    const isHidden = hiddenCases.includes(childCaseID)
    return { ids, textLabel, isHidden, width }
  })
  const buttonsToReturn = isCollectionSet ? consolidateCaseButtonsByAttrValue(caseButtons, hiddenCases) : caseButtons
  lastVisibleIndex.current = Math.min(lastVisibleIndex.current, buttonsToReturn.length - 1)
  return buttonsToReturn
}

export const ParentToggles = observer(function ParentToggles() {
  const { tileWidth } = useGraphLayoutContext()
  const graphModel = useGraphContentModelContext()
  const dataConfig = useGraphDataConfigurationContext()
  const primaryAttribute = dataConfig?.primaryAttributeID ?? ""
  const dataset = dataConfig?.dataset
  const collectionIndexForPrimaryAttribute = dataset?.getCollectionIndexForAttribute(primaryAttribute) ?? 0
  const isCollectionSet = !!(dataset && dataset.collections?.length > 0)
  const hiddenCases = dataConfig?.hiddenCases ?? []
  const itemIDs = dataset?.itemIds ?? []
  const firstVisibleIndex = useRef(0)
  const lastVisibleIndex = useRef(0)
  const caseButtons = createCaseButtons(
    { itemIDs, dataset, collectionIndexForPrimaryAttribute, isCollectionSet, hiddenCases, lastVisibleIndex })
  const caseButtonsListWidth = caseButtons.reduce((acc, button) => acc + button.width + TEXT_OFFSET, 0)
  const isOnlyLastShown = !!graphModel?.showOnlyLastCase
  const toggleButtonText = hiddenCases.length > 0 ? t("DG.NumberToggleView.showAll") : t("DG.NumberToggleView.hideAll")
  const toggleTextWidth = measureText(toggleButtonText, BUTTON_FONT)
  const lastCheckbox = isOnlyLastShown ? t("DG.NumberToggleView.lastChecked") : t("DG.NumberToggleView.lastUnchecked")
  const lastButtonText = `${lastCheckbox} ${t("DG.NumberToggleView.lastLabel")}`
  const lastButtonWidth = measureText(lastButtonText, BUTTON_FONT)
  const [showLeftButton, setShowLeftButton] = useState(false)
  const [showRightButton, setShowRightButton] = useState(false)
  const [buttonsListOffset, setButtonsListOffset] = useState(0)
  const [buttonContainerWidth, setButtonContainerWidth] = useState(0)

  // Returns the currently available width for the button list, the total width of the buttons that can fit within
  // that available width, and the index of the first visible button.
  const buttonContainerDetails = useCallback(() => {
    let buttonsVisibleWidth = 0
    let firstIndex = 0
    const usedWidth = toggleTextWidth + TEXT_OFFSET + lastButtonWidth + TEXT_OFFSET
    let availableWidth = tileWidth - usedWidth
    const needScrollButtons = caseButtonsListWidth > availableWidth

    if (needScrollButtons) {
      const rightScrollButtonWidth = lastVisibleIndex.current < caseButtons.length - 1 ? SCROLL_BUTTON_WIDTH : 0
      const leftScrollButtonWidth = firstVisibleIndex.current !== 0 ? SCROLL_BUTTON_WIDTH : 0
      availableWidth = availableWidth - rightScrollButtonWidth - leftScrollButtonWidth
    }

    // Determine how many buttons can fit within the available width starting from the last visible button
    // and working backwards.
    for (let i = lastVisibleIndex.current; i >= 0; i--) {
      buttonsVisibleWidth += caseButtons[i].width + TEXT_OFFSET
      if (buttonsVisibleWidth > availableWidth) {
        firstIndex = i + 1
        buttonsVisibleWidth -= caseButtons[i].width + TEXT_OFFSET
        break
      }
      firstIndex = i
    }

    return { availableWidth, buttonsVisibleWidth, firstIndex }
  }, [caseButtons, caseButtonsListWidth, lastButtonWidth, tileWidth, toggleTextWidth])

  useEffect(function updateButtonContainerWidth() {
    const { availableWidth, buttonsVisibleWidth, firstIndex } = buttonContainerDetails()
    // Find the offset by summing the widths of all buttons before the first visible button
    let offset = 0
    for (let i = 0; i < firstIndex; i++) {
      offset += caseButtons[i].width + TEXT_OFFSET
    }
    setButtonContainerWidth(buttonsVisibleWidth)
    setButtonsListOffset(-offset)
    firstVisibleIndex.current = firstIndex
    if (caseButtonsListWidth > availableWidth) {
      setShowRightButton(lastVisibleIndex.current !== caseButtons.length - 1)
      setShowLeftButton(firstVisibleIndex.current !== 0)
    } else {
      setShowRightButton(false)
      setShowLeftButton(false)
    }
  }, [buttonContainerDetails, caseButtons, caseButtonsListWidth, tileWidth])

  const handleToggleAll = () => {
    if (hiddenCases.length > 0) {
      dataConfig?.applyModelChange(
        () => {
          graphModel?.setShowOnlyLastCase(false)
          dataConfig.clearHiddenCases()
        },
        {
          undoStringKey: "V3.Undo.graph.showAllCases",
          redoStringKey: "V3.Redo.graph.showAllCases",
          log: {message: "Show all cases from parent toggles", args: {}, category: "data"}
        }
      )
    } else {
      dataConfig?.applyModelChange(
        () => dataConfig.setHiddenCases(Array.from(dataConfig.visibleCaseIds)),
        {
          undoStringKey: "V3.Undo.graph.hideAllCases",
          redoStringKey: "V3.Redo.graph.hideAllCases",
          log: {message: "Hide all cases from parent toggles", args: {}, category: "data"}
        }
      )
    }
  }

  const handleToggleLast = () => {
    const undoString = isOnlyLastShown
      ? "V3.Undo.graph.uncheckLastParentOnly" : "V3.Undo.graph.showLastParentOnly"
    const redoString = isOnlyLastShown
      ? "V3.Redo.graph.uncheckLastParentOnly" : "V3.Redo.graph.showLastParentOnly"
    dataConfig?.applyModelChange(
      () => {
        graphModel?.setShowOnlyLastCase(!isOnlyLastShown)
        if (!isOnlyLastShown) {
          const lastCaseIDs = caseButtons[caseButtons.length - 1].ids
          const allCaseIDs = caseButtons.flatMap((button) => button.ids)
          const hiddenCaseIDs = allCaseIDs.filter((id) => !lastCaseIDs.includes(id))
          dataConfig?.setHiddenCases(hiddenCaseIDs)
        }
      },
      {
        undoStringKey: undoString,
        redoStringKey: redoString,
        log: isOnlyLastShown ? "Disable only showing last parent toggle" : "Enable only showing last parent toggle"
      }
    )
  }

  const handleCaseButtonClick = (ids: string[]) => {
    dataConfig?.applyModelChange(
      () => {
        graphModel?.setShowOnlyLastCase(false)
        const currentHiddenCases = new Set(dataConfig.hiddenCases ?? [])
        ids.forEach((caseID) => {
          if (currentHiddenCases.has(caseID)) {
            currentHiddenCases.delete(caseID)
          } else {
            currentHiddenCases.add(caseID)
          }
        })
        dataConfig.setHiddenCases(Array.from(currentHiddenCases))
      },
      {
        undoStringKey: "V3.Undo.graph.toggleParentVisibility",
        redoStringKey: "V3.Redo.graph.toggleParentVisibility",
        log: "Toggle parent group visibility"
      }
    )
  }

  const handleScroll = (direction: "left" | "right") => {
    const { availableWidth } = buttonContainerDetails()
    let newOffset = 0
    let buttonsVisibleWidth = 0
    const increment = direction === "right" ? 1 : -1
    const startIndex = direction === "right" ? lastVisibleIndex.current + 1 : firstVisibleIndex.current - 1
    const endIndex = direction === "right" ? caseButtons.length : -1

    for (let i = startIndex; i !== endIndex; i += increment) {
      const buttonWidth = caseButtons[i].width + TEXT_OFFSET
      buttonsVisibleWidth += buttonWidth

      if (buttonsVisibleWidth > availableWidth) {
        buttonsVisibleWidth -= buttonWidth
        break
      }

      newOffset += buttonWidth

      if (direction === "right") {
        firstVisibleIndex.current++
        lastVisibleIndex.current++
      } else {
        firstVisibleIndex.current--
        lastVisibleIndex.current--
      }
    }
    if (direction === "right") {
      setButtonsListOffset(prevOffset => prevOffset - newOffset)
    } else {
      setButtonsListOffset(prevOffset => prevOffset + newOffset)
    }

    setButtonContainerWidth(buttonsVisibleWidth)
    setShowLeftButton(firstVisibleIndex.current > 0)
    setShowRightButton(lastVisibleIndex.current < caseButtons.length - 1)
  }

  const renderCaseButtons = () => {
    return (
      <div className="parent-toggles-case-buttons" data-testid="parent-toggles-case-buttons">
        {showLeftButton &&
          <button
            className="parent-toggles-case-buttons-left"
            data-testid="parent-toggles-case-buttons-left"
            onClick={() => handleScroll("left")}
          >
            <LeftArrowIcon />
          </button>
        }
        <div
          className="parent-toggles-case-buttons-list-container"
          data-testid="parent-toggles-case-buttons-list-container"
          style={{ width: `${buttonContainerWidth}px` }}
        >
          <div
            className="parent-toggles-case-buttons-list"
            data-testid="parent-toggles-case-buttons-list"
            style={{ transform: `translateX(${buttonsListOffset}px)` }}
          >
            {caseButtons.map((caseButton) => {
              const key = caseButton.ids[0]
              return <button
                       key={key}
                       className={caseButton.isHidden ? "case-hidden" : ""}
                       data-testid={`parent-toggles-case-buttons-${caseButton.textLabel?.replace(/\s/g, "-")}`}
                       onClick={() => handleCaseButtonClick(caseButton.ids)}
                       title={t("DG.NumberToggleView.indexTooltip")}
                     >
                       {caseButton.textLabel}
                     </button>
            })}
          </div>
        </div>
        {showRightButton &&
          <button
            className="parent-toggles-case-buttons-right"
            data-testid="parent-toggles-case-buttons-right"
            onClick={() => handleScroll("right")}
          >
            <RightArrowIcon />
          </button>
        }
      </div>
    )
  }

  return (
    <div className="parent-toggles-container" data-testid="parent-toggles-container">
      <button
        className="parent-toggles-all"
        data-testid="parent-toggles-all"
        onClick={handleToggleAll}
        title={
          hiddenCases.length > 0
            ? t("DG.NumberToggleView.showAllTooltip")
            : t("DG.NumberToggleView.hideAllTooltip")
        }
      >
        {toggleButtonText}
      </button>
      {renderCaseButtons()}
      <button
        className="parent-toggles-last"
        data-testid="parent-toggles-last"
        onClick={handleToggleLast}
        title={
          isOnlyLastShown
            ? t("DG.NumberToggleView.disableLastModeTooltip")
            : t("DG.NumberToggleView.enableLastModeTooltip")
        }
      >
        {lastButtonText}
      </button>
    </div>
  )
})
