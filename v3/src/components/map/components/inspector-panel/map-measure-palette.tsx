import React from "react"
import {Box, Checkbox, Flex, FormControl, /*useToast*/} from "@chakra-ui/react"
import {t} from "../../../../utilities/translation/translate"
import {ITileModel} from "../../../../models/tiles/tile-model"
import {InspectorPalette} from "../../../inspector-panel"
import ValuesIcon from "../../../../assets/icons/icon-values.svg"
// import {isMapContentModel} from "../../models/map-content-model"

interface IProps {
  tile?: ITileModel
  panelRect?: DOMRect
  buttonRect?: DOMRect
  setShowPalette: (palette: string | undefined) => void
}

export const MapMeasurePalette = ({tile, panelRect, buttonRect, setShowPalette}: IProps) => {
  // const toast = useToast()
  // const mapModel = isMapContentModel(tile?.content) ? tile?.content : undefined
  const titles = ["DG.Inspector.mapGrid", "DG.Inspector.mapPoints", "DG.Inspector.mapLines"]

/*
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
*/

  return (
    <InspectorPalette
      title={t("DG.Inspector.values")}
      Icon={<ValuesIcon/>}
      setShowPalette={setShowPalette}
      panelRect={panelRect}
      buttonRect={buttonRect}
    >
      <Flex className="palette-form" direction="column">
        <Box className="form-title">Show ...</Box>
        {
          titles.map((title) => {
            const titleSlug = t(title).replace(/ /g, "-").toLowerCase()
            return (
              <FormControl key={titleSlug}>
                <Checkbox
                  data-testid={`adornment-checkbox-${titleSlug}`}
                  /*
                  defaultChecked={checked}
                  onChange={clickHandler ? clickHandler : e => handleSetting(t(title), e.target.checked)}
                  */
                >
                  {t(title)}
                </Checkbox>
              </FormControl>
            )
          })
        }
      </Flex>
    </InspectorPalette>
  )
}
