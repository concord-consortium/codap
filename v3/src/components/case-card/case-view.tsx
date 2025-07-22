import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import React, { useCallback, useEffect, useRef, useState } from "react"
import { colorCycleClass } from "../case-tile-common/case-tile-utils"
import { CollectionContext, ParentCollectionContext, useCollectionContext } from "../../hooks/use-collection-context"
import { useFreeTileLayoutContext } from "../../hooks/use-free-tile-layout-context"
import { IAttribute } from "../../models/data/attribute"
import { ICollectionModel } from "../../models/data/collection"
import { IDataSet } from "../../models/data/data-set"
import { IGroupedCase } from "../../models/data/data-set-types"
import { createAttributesNotification } from "../../models/data/data-set-notifications"
import { uiState } from "../../models/ui-state"
import { uniqueName } from "../../utilities/js-utils"
import { t } from "../../utilities/translation/translate"
import { CaseAttrsView } from "./case-attrs-view"
import { CaseCardCollectionSpacer } from "./case-card-collection-spacer"
import { CaseCardHeader } from "./case-card-header"
import { useCaseCardModel } from "./use-case-card-model"

import AddIcon from "../../assets/icons/add-data-icon.svg"

import "./case-view.scss"

interface ISingleCaseViewProps {
  cases: IGroupedCase[]
  className?: string
  collection?: ICollectionModel
  displayedCase: IGroupedCase
  displayedCaseLineage?: readonly string[]
  dummy?: boolean
  hidden?: boolean
  level: number
  onAddNewAttribute?: () => void
  onNewCollectionDrop?: (dataSet: IDataSet, attrId: string, beforeCollectionId: string) => void
  onSelectCases?: (caseIds: string[]) => void
  style?: React.CSSProperties
}

const SingleCaseView = observer(function SingleCaseView({
  cases, className, collection, displayedCase, displayedCaseLineage, dummy, hidden, level, onAddNewAttribute,
  onNewCollectionDrop, onSelectCases, style
}: ISingleCaseViewProps) {
  const cardModel = useCaseCardModel()
  const childCases = cardModel?.groupChildCases(displayedCase.__id__) ?? []
  const childCollection = collection?.child

  const classes = clsx(className, { dummy, hidden })
  return (
    <div className={classes} data-testid="case-card-view" style={style}>
      <CaseCardHeader cases={cases} level={level}/>
      <div className="case-card-attributes">
        <button className="add-attribute" onClick={onAddNewAttribute} data-testid="add-attribute-button">
          <AddIcon />
        </button>
        <CaseAttrsView
          caseItem={displayedCase}
          collection={collection}
        />
        { childCollection && (
          <ParentCollectionContext.Provider key={`${displayedCase?.__id__}-${level}`} value={collection?.id}>
            <CollectionContext.Provider value={childCollection.id}>
              <CaseView
                cases={childCases}
                dummy={dummy}
                level={level + 1}
                onSelectCases={onSelectCases}
                displayedCaseLineage={displayedCaseLineage}
                onNewCollectionDrop={onNewCollectionDrop}
              />
            </CollectionContext.Provider>
          </ParentCollectionContext.Provider>
        )}
      </div>
    </div>
  )
})

interface ICaseViewProps {
  cases: IGroupedCase[]
  displayedCaseLineage?: readonly string[]
  dummy?: boolean
  onNewCollectionDrop?: (dataSet: IDataSet, attrId: string, beforeCollectionId: string) => void
  level: number
  onSelectCases?: (caseIds: string[]) => void
}

interface IRenderSingleCaseViewArgs {
  displayedCase: IGroupedCase
  displayedCaseLineage: readonly string[]
  dummy?: boolean
  hidden?: boolean
  style?: React.CSSProperties
}

export const CaseView = observer(function InnerCaseView({
  cases, displayedCaseLineage = [], dummy, level, onNewCollectionDrop, onSelectCases
}: ICaseViewProps) {
  const cardModel = useCaseCardModel()
  const tileLayout = useFreeTileLayoutContext()
  const data = cardModel?.data
  const collectionCount = data?.collections.length ?? 1
  const collectionId = useCollectionContext()
  const collection = data?.getCollection(collectionId)
  const initialSelectedCase = collection?.getCaseGroup(displayedCaseLineage[level])?.groupedCase
  const displayedCase = initialSelectedCase ?? cases[0]
  const displayedCaseId = displayedCase?.__id__
  const displayedCaseIndex = collection?.getCaseIndex(displayedCaseId) ?? -1

  // FIXME: This should handle all selected cases
  const previousSelectedCaseIndex = useRef<number>(displayedCaseIndex)
  const isAnimating = cardModel?.animationLevel === level
  const [animationStarted, setAnimationStarted] = useState(false)
  const isFlippingRight = cardModel?.animationDirection === "right"
  const previousDisplayedCase = useRef<IGroupedCase>(displayedCase)
  const previousDisplayedCaseLineage = useRef<readonly string[]>(displayedCaseLineage)

  useEffect(() => {
    if (dummy || isAnimating || !cardModel) return

    if (previousSelectedCaseIndex.current !== displayedCaseIndex) {
      if (level < cardModel.animationLevel) {
        cardModel.setAnimationLevel(level)
        cardModel.setAnimationDirection(
          previousSelectedCaseIndex.current <= displayedCaseIndex ? "right" : "left"
        )
        cardModel.setAnimationTimeout(setTimeout(() => {
          cardModel.setAnimationLevel(Infinity)
          setAnimationStarted(false)
        }, 300))

        setTimeout(() => setAnimationStarted(true))
      }

      setTimeout(() => {
        previousDisplayedCaseLineage.current = displayedCaseLineage
        previousDisplayedCase.current = displayedCase
      }, 300)

      previousSelectedCaseIndex.current = displayedCaseIndex
    }
  }, [cardModel, displayedCase, displayedCaseIndex, displayedCaseLineage, dummy, isAnimating, level])

  const handleNewCollectionDrop = useCallback((dataSet: IDataSet, attrId: string, collId: string) => {
    const attr = dataSet.attrFromID(attrId)
    attr && onNewCollectionDrop?.(dataSet, attrId, collId)
  }, [onNewCollectionDrop])

  const handleAddNewAttribute = () => {
    let attribute: IAttribute | undefined
    data?.applyModelChange(() => {
      const newAttrName = uniqueName(t("DG.CaseTable.defaultAttrName"),
        (aName: string) => !data.attributes.find(attr => aName === attr.name)
      )
      attribute = data.addAttribute({ name: newAttrName }, { collection: collectionId })
      if (attribute) {
        uiState.setAttrIdToEdit(attribute.id)
      }
    }, {
      notify: () => createAttributesNotification(attribute ? [attribute] : [], data),
      undoStringKey: "DG.Undo.caseTable.createAttribute",
      redoStringKey: "DG.Redo.caseTable.createAttribute"
    })
  }

  const classes = clsx(
    "case-card-view",
    colorCycleClass(level, collectionCount),
    { "animating": animationStarted && !dummy }
  )
  const tileWidth = tileLayout?.width ?? 0
  const leftLeft = `-${tileWidth}px`
  const rightLeft = `${tileWidth}px`
  const left = !isAnimating || animationStarted ? 0 : isFlippingRight ? leftLeft : rightLeft
  const style = { left }
  const otherLeft = !animationStarted ? 0 : isFlippingRight ? rightLeft : leftLeft
  const otherStyle = { left: otherLeft }

  const renderSingleCaseView = (args: IRenderSingleCaseViewArgs) => (
    <SingleCaseView
      cases={cases}
      className={classes}
      collection={collection}
      displayedCase={args.displayedCase}
      displayedCaseLineage={args.displayedCaseLineage}
      dummy={args.dummy}
      hidden={args.hidden}
      onAddNewAttribute={dummy ? undefined : handleAddNewAttribute}
      onNewCollectionDrop={dummy ? undefined : handleNewCollectionDrop}
      onSelectCases={dummy ? undefined : onSelectCases}
      level={level}
      style={args.style}
    />
  )

  return (
    <>
      <CaseCardCollectionSpacer onDrop={handleNewCollectionDrop} collectionId={collectionId}/>
      {!dummy && renderSingleCaseView({
        displayedCase: previousDisplayedCase.current,
        displayedCaseLineage: previousDisplayedCaseLineage.current,
        dummy: true,
        hidden: !isAnimating,
        style: otherStyle
      })}
      {renderSingleCaseView({
        displayedCase,
        displayedCaseLineage,
        dummy,
        hidden: false,
        style
      })}
    </>
  )
})
