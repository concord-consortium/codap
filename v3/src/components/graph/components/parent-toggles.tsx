import React, { useCallback, useEffect, useRef, useState } from "react"
import { observer } from "mobx-react-lite"
import { t } from "../../../utilities/translation/translate"
import { useGraphDataConfigurationContext } from "../hooks/use-graph-data-configuration-context"
import { useGraphLayoutContext } from "../hooks/use-graph-layout-context"
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
  caseIDs: string[]
  dataset?: IDataSet
  hiddenCases: string[] 
  isCollectionSet: boolean
}

const SCROLL_BUTTON_WIDTH = 32
const TEXT_OFFSET = 5
const BUTTON_FONT = `11px Montserrat, sans-serif`

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
  const { caseIDs, dataset, isCollectionSet, hiddenCases } = props
  if (!dataset) return []

  // Determine the attribute to use for setting the buttons' text labels.
  const firstAttrId = isCollectionSet
                        ? dataset.collections[0].attributes[0]?.id
                        : dataset.attributes[0].id

  const caseButtons = caseIDs.map((caseID) => {
    // Buttons start off associated with a single case but can potentially be associated with multiple cases if a
    // parent collection is set. When a collection is set, the association with multiple cases will be made
    // in `consolidateCaseButtonsByAttrValue`.
    const ids = [caseID]
    const textLabel = firstAttrId && dataset?.getStrValue(caseID, firstAttrId)
    const width = textLabel ? measureText(textLabel, BUTTON_FONT) : 0
    const isHidden = !!hiddenCases.includes(caseID)
    return { ids, textLabel, isHidden, width }
  })

  return isCollectionSet ? consolidateCaseButtonsByAttrValue(caseButtons, hiddenCases) : caseButtons
}

export const ParentToggles = observer(function ParentToggles() {
  const { tileWidth } = useGraphLayoutContext()
  const dataConfig = useGraphDataConfigurationContext()
  const dataset = dataConfig?.dataset
  const isCollectionSet = !!(dataset && dataset.collections?.length > 0)
  const hiddenCases = dataConfig?.hiddenCases ?? []
  const caseIDs = dataset?.cases.map((c) => c.__id__) ?? []
  const caseButtons = createCaseButtons({ caseIDs, dataset, isCollectionSet, hiddenCases })
  const caseButtonsListWidth = caseButtons.reduce((acc, button) => acc + button.width + TEXT_OFFSET, 0)
  const [isOnlyLastShown, setIsOnlyLastShown] = useState(false)
  const firstVisibleIndex = useRef(0)
  const lastVisibleIndex = useRef(caseButtons.length - 1)
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
  // that available width from the given `firstIndex`, and the index of the last visible button.
  const buttonContainerDetails = useCallback((firstIndex: number) => {
    let buttonsVisibleWidth = 0
    let lastIndex = 0
    const usedWidth = toggleTextWidth + TEXT_OFFSET + lastButtonWidth + TEXT_OFFSET + SCROLL_BUTTON_WIDTH * 2
    const availableWidth = tileWidth - usedWidth

    for (let i = firstIndex; i < caseButtons.length; i++) {
      buttonsVisibleWidth += caseButtons[i].width + TEXT_OFFSET
      if (buttonsVisibleWidth > availableWidth) {
        lastIndex = i - 1
        buttonsVisibleWidth -= caseButtons[i].width + TEXT_OFFSET
        break
      }
      lastIndex = i
    }

    return { availableWidth, buttonsVisibleWidth, lastIndex }
  }, [caseButtons, lastButtonWidth, tileWidth, toggleTextWidth])

  useEffect(function updateButtonContainerWidth() {
    const { availableWidth, buttonsVisibleWidth, lastIndex } = buttonContainerDetails(firstVisibleIndex.current)
    setButtonContainerWidth(buttonsVisibleWidth)
    if (caseButtonsListWidth > availableWidth) {
      lastVisibleIndex.current = lastIndex
      setShowRightButton(true)
      setShowLeftButton(true)
    } else {
      setShowRightButton(false)
      setShowLeftButton(false)
    }
  }, [buttonContainerDetails, caseButtonsListWidth, tileWidth])

  const handleToggleAll = () => {
    if (hiddenCases.length > 0) {
      setIsOnlyLastShown(false)
      dataConfig?.applyModelChange(() => dataConfig.clearHiddenCases())
    } else {
      dataConfig?.applyModelChange(() => dataConfig.setHiddenCases(Array.from(dataConfig.allCaseIDs)))
    }
  }

  const handleToggleLast = () => {
    setIsOnlyLastShown(!isOnlyLastShown)
    if (!isOnlyLastShown) {
      const lastCaseIDs = caseButtons[caseButtons.length - 1].ids
      const allCaseIDs = caseButtons.flatMap((button) => button.ids)
      const hiddenCaseIDs = allCaseIDs.filter((id) => !lastCaseIDs.includes(id))
      dataConfig?.applyModelChange(() => dataConfig?.setHiddenCases(hiddenCaseIDs))
    }
  }

  const handleCaseButtonClick = (ids: string[]) => {
    setIsOnlyLastShown(false)
    ids.forEach((caseID) => {
      const newHiddenCases = dataConfig?.hiddenCases.includes(caseID)
                               ? dataConfig.hiddenCases.filter((id) => id !== caseID)
                               : dataConfig ? [...dataConfig.hiddenCases, caseID] : []
      dataConfig?.applyModelChange(() => dataConfig.setHiddenCases(newHiddenCases))
    })
  }

  const handleScroll = (direction: "left" | "right") => {
    const isScrollingRight = direction === "right"
    const boundaryIndex = isScrollingRight ? lastVisibleIndex.current : firstVisibleIndex.current
    const limitIndex = isScrollingRight ? caseButtons.length - 1 : 0
    if (boundaryIndex === limitIndex) return

    const nextButtonIndex = isScrollingRight ? boundaryIndex + 1 : boundaryIndex - 1
    const nextButtonOffset = caseButtons[nextButtonIndex].width + TEXT_OFFSET
    const offset = isScrollingRight ? -nextButtonOffset : nextButtonOffset
    const additionalOffset = !isScrollingRight && lastVisibleIndex.current === caseButtons.length - 1
                               ? lastButtonWidth + TEXT_OFFSET + SCROLL_BUTTON_WIDTH * 2
                               : 0
    const fullOffset = buttonsListOffset + offset - additionalOffset
    setButtonsListOffset(fullOffset)

    if (isScrollingRight) {
      lastVisibleIndex.current++
      firstVisibleIndex.current++
    } else {
      firstVisibleIndex.current--
      lastVisibleIndex.current--
    }
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
