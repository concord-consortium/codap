import React from "react"
import {Button, Icon, Flex} from "@chakra-ui/react"
import {GoTriangleDown, GoTriangleRight} from "react-icons/go"
import {observer} from "mobx-react-lite"
import t from "../../../../utilities/translation/translate"
import {ITileModel} from "../../../../models/tiles/tile-model"
import {isGraphContentModel} from "../../models/graph-content-model"
import {GraphContentModelContext} from "../../hooks/use-graph-content-model-context"
import {GraphDataConfigurationContext} from "../../hooks/use-graph-data-configuration-context"
import {IGroupItem} from "../../adornments/adornments-store-utils"

import "./point-format-panel.scss"
import './measure-panel.scss'

interface IProps {
  tile?: ITileModel
  measureGroup: IGroupItem
}

export const GraphMeasureGroup = observer(function GraphMeasureGroup({
                                                                       tile, measureGroup
                                                                     }: IProps) {
  const graphModel = isGraphContentModel(tile?.content) ? tile?.content : undefined
  if (!isGraphContentModel(graphModel)) {
    return null
  }
  const adornmentsStore = graphModel.adornmentsStore
  const itemsAreVisibile = adornmentsStore.getVisibility(measureGroup.rulerStateKey)
  const isOpenIcon = itemsAreVisibile
    ? <Icon as={GoTriangleDown} boxSize={5}/>
    : <Icon as={GoTriangleRight} boxSize={5}/>

  const toggleVisibility = () => {
    adornmentsStore.toggleVisibility(measureGroup.rulerStateKey)
  }

  const renderMeasureItems = () => {
    if (itemsAreVisibile) {
      const theItems = measureGroup.menuItems.map(measure => {
        const {componentInfo, componentContentInfo, title} = measure
        const titleSlug = t(title).replace(/ /g, "-").toLowerCase()
        if (componentInfo && componentContentInfo) {
          return (
            <GraphContentModelContext.Provider key={`${titleSlug}-graph-model-context`} value={graphModel}>
              <GraphDataConfigurationContext.Provider
                key={`${titleSlug}-data-configuration-context`}
                value={graphModel.dataConfiguration}
              >
                <componentInfo.Controls
                  key={titleSlug}
                  adornmentModel={componentContentInfo.modelClass}
                />
              </GraphDataConfigurationContext.Provider>
            </GraphContentModelContext.Provider>
          )
        }
      })
      return (
        <Flex direction="column" className="measure-items">
          {theItems}
        </Flex>
      )
    }
  }

  return (
    <Flex direction="column">
      <Button leftIcon={isOpenIcon} className='measure-group-button' variant='solid' size='sm' left={'-5px'}
              iconSpacing='0px' onClick={toggleVisibility}>
        {t(measureGroup.title)}
      </Button>
      {renderMeasureItems()}
    </Flex>)
})
