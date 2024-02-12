import React from "react"
import { Box, Checkbox, Flex, FormControl, useToast} from "@chakra-ui/react"
import { observer } from "mobx-react-lite"
import { t } from "../../../../utilities/translation/translate"
import { ITileModel } from "../../../../models/tiles/tile-model"
import { isGraphContentModel } from "../../models/graph-content-model"
import { GraphContentModelContext } from "../../hooks/use-graph-content-model-context"
import { GraphDataConfigurationContext } from "../../hooks/use-graph-data-configuration-context"
import { InspectorPalette } from "../../../inspector-panel"
import ValuesIcon from "../../../../assets/icons/icon-values.svg"

import "./point-format-panel.scss"

interface IProps {
  tile?: ITileModel
  panelRect?: DOMRect
  buttonRect?: DOMRect
  setShowPalette: (palette: string | undefined) => void
}

export const GraphMeasurePalette = observer(function GraphMeasurePalette({
  tile, panelRect, buttonRect, setShowPalette
}: IProps) {
  const toast = useToast()
  const graphModel = isGraphContentModel(tile?.content) ? tile?.content : undefined
  const measures = graphModel ? graphModel?.adornmentsStore.getAdornmentsMenuItems(graphModel.plotType) : undefined

  const handleSetting = (measure: string, checked: boolean) => {
    // Show toast pop-ups for adornments that haven't been implemented yet.
    // TODO: Remove this once all adornments are implemented.
    toast({
      title: 'Item clicked',
      description: `You clicked on ${measure} ${checked}`,
      status: 'success',
      duration: 5000,
      isClosable: true,
    })
    return null
  }

  return (
    <InspectorPalette
      title={t("DG.Inspector.values")}
      Icon={<ValuesIcon />}
      setShowPalette={setShowPalette}
      panelRect={panelRect}
      buttonRect={buttonRect}
    >
      <Flex className="palette-form" direction="column">
        <Box className="form-title">Show ...</Box>
        {graphModel && measures?.map(measure => {
          const { checked, clickHandler, componentInfo, componentContentInfo, disabled, title } = measure
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
          } else {
            return (
              <FormControl key={titleSlug}>
                <Checkbox
                  data-testid={`adornment-checkbox-${titleSlug}`}
                  defaultChecked={checked}
                  isDisabled={!!disabled}
                  onChange={clickHandler ? clickHandler : e => handleSetting(t(title), e.target.checked)}
                >
                  {t(title)}
                </Checkbox>
              </FormControl>
            )
          }
        })}
      </Flex>
    </InspectorPalette>
  )
})
