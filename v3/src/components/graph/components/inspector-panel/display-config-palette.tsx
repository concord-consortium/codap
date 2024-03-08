import React from "react"
import {observer} from "mobx-react-lite"
import { Flex, Radio, RadioGroup, Stack } from "@chakra-ui/react"
import { t } from "../../../../utilities/translation/translate"
import { InspectorPalette } from "../../../inspector-panel"
import BarChartIcon from "../../../../assets/icons/icon-segmented-bar-chart.svg"
import { ITileModel } from "../../../../models/tiles/tile-model"
import { isGraphContentModel } from "../../models/graph-content-model"
import { isPointDisplayType } from "../../../data-display/data-display-types"

import "../../../data-display/inspector/inspector-panel.scss"

interface IProps {
  tile?: ITileModel
  panelRect?: DOMRect
  buttonRect?: DOMRect
  setShowPalette: (palette: string | undefined) => void;
}
export const DisplayConfigPalette = observer(function DisplayConfigPanel(props: IProps) {
  const { buttonRect, panelRect, setShowPalette, tile } = props
  const graphModel = isGraphContentModel(tile?.content) ? tile?.content : undefined
  const selectedConfig = graphModel?.pointDisplayType

  const handleSelection = (configType: string) => {
    if (isPointDisplayType(configType)) {
      graphModel?.setPointConfig(configType)
    }
  }

  return (
    <InspectorPalette
      title={t("DG.Inspector.configuration")}
      Icon={<BarChartIcon/>}
      setShowPalette={setShowPalette}
      panelRect={panelRect}
      buttonRect={buttonRect}
    >
      <Flex className="palette-form" direction="column">
        <RadioGroup defaultValue={selectedConfig}>
          <Stack>
            <Radio
              size="md"
              value="points"
              data-testid="points-radio-button"
              onChange={(e) => handleSelection(e.target.value)}
            >
              {t("DG.Inspector.graphPlotPoints")}
            </Radio>
            <Radio
              size="md"
              value="bins"
              data-testid="bins-radio-button"
              onChange={(e) => handleSelection(e.target.value)}
            >
              {t("DG.Inspector.graphGroupIntoBins")}
            </Radio>
            <Radio
              size="md"
              value="bars"
              data-testid="bars-radio-button"
              onChange={(e) => handleSelection(e.target.value)}
            >
              {t("DG.Inspector.graphBarForEachPoint")}
            </Radio>
          </Stack>
        </RadioGroup>
      </Flex>
    </InspectorPalette>
  )
})
