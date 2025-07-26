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
import { urlParams } from "../../utilities/url-params"
import { CaseAttrsView } from "./case-attrs-view"
import { CaseCardCollectionSpacer } from "./case-card-collection-spacer"
import { CaseCardHeader } from "./case-card-header"
import { useCaseCardModel } from "./use-case-card-model"

import AddIcon from "../../assets/icons/add-data-icon.svg"

import "./case-view.scss"

const animationDuration = 300

interface ICaseViewProps {
  cases: IGroupedCase[]
  dummy?: boolean // Dummy case views are used for animations and have stripped down functionality
  onNewCollectionDrop?: (dataSet: IDataSet, attrId: string, beforeCollectionId: string) => void
  level: number
  onSelectCases?: (caseIds: string[]) => void
}

interface IRenderSingleCaseViewArgs {
  displayedCase?: IGroupedCase
  dummy?: boolean
  style?: React.CSSProperties
}

export const CaseView = observer(function InnerCaseView({
  cases, dummy, level, onNewCollectionDrop, onSelectCases
}: ICaseViewProps) {
  const cardModel = useCaseCardModel()
  const tileLayout = useFreeTileLayoutContext()
  const data = cardModel?.data
  const collectionCount = data?.collections.length ?? 1
  const collectionId = useCollectionContext()
  const collection = data?.getCollection(collectionId)
  const selectedCaseIndices = data?.partiallySelectedCaseIndicesByCollection ?? []
  const collectionSelectedCaseIndices = selectedCaseIndices[level] ?? []
  const displayedCaseIndex = collectionSelectedCaseIndices[0] ?? -1
  const previousSelectedCaseIndex = useRef<number>(displayedCaseIndex)
  const displayedCaseId = collection?.caseIds[displayedCaseIndex] ?? ""
  const displayedCase = data?.caseInfoMap.get(displayedCaseId)?.groupedCase ?? cases[0]

  const disableAnimation = urlParams.noComponentAnimation != null
  const isAnimating = cardModel?.animationLevel === level
  const [animationStarted, setAnimationStarted] = useState(false)
  const isFlippingRight = cardModel?.animationDirection === "right"
  const dummyDisplayedCase = useRef<IGroupedCase | undefined>(displayedCase)
  const collectionSelectedCaseIndicesString = collectionSelectedCaseIndices.join(",")
  const previousCollectionSelectedCaseIndicesString = useRef<string>(collectionSelectedCaseIndicesString)

  // Manage the animation
  useEffect(() => {
    if (disableAnimation || dummy || isAnimating || !cardModel) return

    // Trigger the animation when the selection at this level changes
    if (previousCollectionSelectedCaseIndicesString.current !== collectionSelectedCaseIndicesString) {
      // The lowest level should animate
      if (level < cardModel.animationLevel) {
        cardModel.setAnimationLevel(level)
        cardModel.setAnimationDirection(previousSelectedCaseIndex.current > displayedCaseIndex ? "right" : "left")
        
        // Reset the animation after the proper duration
        cardModel.setAnimationTimeout(setTimeout(() => {
          cardModel.setAnimationLevel(Infinity)
          setAnimationStarted(false)
        }, animationDuration))

        // We need one frame to set up the animation, so we actually start the animation in a timeout
        setTimeout(() => {
          // We need to make sure a lower level did not supersede this one
          if (cardModel.animationLevel === level) setAnimationStarted(true)
        })
      }

      // Update the dummy displayed case after the animation duration
      setTimeout(() => {
        dummyDisplayedCase.current = displayedCase
      }, animationDuration)

      // Immediately update the case index and indices string so we know when the animation should occur again
      previousSelectedCaseIndex.current = displayedCaseIndex
      previousCollectionSelectedCaseIndicesString.current = collectionSelectedCaseIndicesString
    }
  }, [
    cardModel, cases.length, collectionSelectedCaseIndicesString, disableAnimation, displayedCase, displayedCaseIndex,
    dummy, isAnimating, level
  ])

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
    { animating: animationStarted && !dummy }
  )
  const tileWidth = tileLayout?.width ?? 0
  const leftLeft = `-${tileWidth}px`
  const rightLeft = `${tileWidth}px`
  const left = !isAnimating || animationStarted ? 0 : isFlippingRight ? leftLeft : rightLeft
  const style = { left }
  const dummyLeft = !animationStarted ? 0 : isFlippingRight ? rightLeft : leftLeft
  const dummyStyle: React.CSSProperties = {
    left: dummyLeft,
    position: "absolute",
    visibility: !isAnimating ? "hidden" : undefined
  }

  const renderSingleCaseView = (args: IRenderSingleCaseViewArgs) => (
    <SingleCaseView
      cases={cases}
      className={classes}
      collection={collection}
      displayedCase={args.displayedCase}
      dummy={args.dummy}
      onAddNewAttribute={args.dummy ? undefined : handleAddNewAttribute}
      onNewCollectionDrop={args.dummy ? undefined : handleNewCollectionDrop}
      onSelectCases={args.dummy ? undefined : onSelectCases}
      level={level}
      style={args.style}
    />
  )

  return (
    <>
      <CaseCardCollectionSpacer onDrop={handleNewCollectionDrop} collectionId={collectionId}/>
      { // Render the dummy single case view, used for animations. Only actual case views have dummies.
        !dummy && renderSingleCaseView({
          displayedCase: dummyDisplayedCase.current,
          dummy: true,
          style: dummyStyle
        })
      }
      { // Render the actual single case view
        renderSingleCaseView({
          displayedCase,
          dummy,
          style
        })
      }
    </>
  )
})

// Each level has two SingleCaseViews, one actual and one dummy for animations

interface ISingleCaseViewProps {
  cases: IGroupedCase[]
  className?: string
  collection?: ICollectionModel
  displayedCase?: IGroupedCase
  dummy?: boolean // When dummy is true, many features are surpressed
  level: number
  onAddNewAttribute?: () => void
  onNewCollectionDrop?: (dataSet: IDataSet, attrId: string, beforeCollectionId: string) => void
  onSelectCases?: (caseIds: string[]) => void
  style?: React.CSSProperties
}

const SingleCaseView = observer(function SingleCaseView({
  cases, className, collection, displayedCase, dummy, level, onAddNewAttribute, onNewCollectionDrop,
  onSelectCases, style
}: ISingleCaseViewProps) {
  const cardModel = useCaseCardModel()
  const childCases = displayedCase ? cardModel?.groupChildCases(displayedCase.__id__) ?? [] : []
  const childCollection = collection?.child

  return (
    <div className={className} data-testid="case-card-view" style={style}>
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
                onNewCollectionDrop={onNewCollectionDrop}
              />
            </CollectionContext.Provider>
          </ParentCollectionContext.Provider>
        )}
      </div>
    </div>
  )
})
