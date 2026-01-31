import {Button, Icon, Flex} from "@chakra-ui/react"
import {observer} from "mobx-react-lite"
import GoTriangleDown from "../../../../assets/icons/github-octicons/triangle-down.svg"
import GoTriangleRight from "../../../../assets/icons/github-octicons/triangle-right.svg"
import {ITileModel} from "../../../../models/tiles/tile-model"
import {uiState} from "../../../../models/ui-state"
import {t} from "../../../../utilities/translation/translate"
import {IGroupItem} from "../../adornments/store/adornments-store-utils"
import {GraphContentModelContext} from "../../hooks/use-graph-content-model-context"
import {GraphDataConfigurationContext} from "../../hooks/use-graph-data-configuration-context"
import {isGraphContentModel} from "../../models/graph-content-model"

import './graph-measure-group.scss'

interface IProps {
  tile?: ITileModel
  measureGroup: IGroupItem
}

export const GraphMeasureGroup = observer(
  function GraphMeasureGroup({ tile, measureGroup }: IProps)
{
  const graphModel = isGraphContentModel(tile?.content) ? tile?.content : undefined
  if (!isGraphContentModel(graphModel)) {
    return null
  }
  const itemsAreVisible = measureGroup.rulerStateKey && uiState.getRulerStateVisibility(measureGroup.rulerStateKey)
  const isOpenIcon = itemsAreVisible
    ? <Icon as={GoTriangleDown} boxSize={5}/>
    : <Icon as={GoTriangleRight} boxSize={5}/>

  const toggleVisibility = () => {
    measureGroup.rulerStateKey && uiState.toggleRulerStateVisibility(measureGroup.rulerStateKey)
  }

  const renderMeasureItems = () => {
    if (itemsAreVisible) {
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
      <Button leftIcon={isOpenIcon}
              className={'measure-group-button'}
              data-testid={`adornment-toggle-${measureGroup.rulerStateKey}`}
              variant='solid' size='sm' left={'-5px'}
              iconSpacing='0px' onClick={toggleVisibility}>
        {t(measureGroup.title)}
      </Button>
      {renderMeasureItems()}
    </Flex>)
})
