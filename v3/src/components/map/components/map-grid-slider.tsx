import {MutableRefObject, useRef} from "react"
import {Portal, Slider, SliderTrack, SliderFilledTrack, SliderThumb,} from "@chakra-ui/react"
import {IMapContentModel} from "../models/map-content-model"
import {isMapPointLayerModel} from "../models/map-point-layer-model"
import { logStringifiedObjectMessage } from "../../../lib/log-message"

export const MapGridSlider = function MapGridSlider(props: {
  mapModel: IMapContentModel
  mapRef: MutableRefObject<HTMLDivElement | null>
}) {
  const {mapModel, mapRef} = props

  const getAverageGridMultiplier = () => {
    const gridMultipliers = mapModel.layers
      .filter(isMapPointLayerModel)
      .map(layer => layer.gridModel.gridMultiplier)
    return gridMultipliers.reduce((a, b) => a + b, 0) / gridMultipliers.length
  }

  const prevGridMultiplier = useRef(getAverageGridMultiplier())

  const handleChange = (value: number) => {
    mapModel.layers.forEach(layer => {
      if (isMapPointLayerModel(layer) && layer.gridModel.isVisible) {
        layer.gridModel.setDynamicGridMultiplier(value)
      }
    })
  }

  const handleChangeEnd = (value: number) => {
    mapModel.applyModelChange(() => {
        mapModel.layers.forEach(layer => {
          if (isMapPointLayerModel(layer) && layer.gridModel.isVisible) {
            layer.gridModel.setGridMultiplier(value)
          }
        })
      },
      {
        undoStringKey: "DG.Undo.map.changeGridSize",
        redoStringKey: "DG.Redo.map.changeGridSize",
        log: logStringifiedObjectMessage("Map grid size changed: %@",
                {from: prevGridMultiplier.current, to: value})
      }
    )
    prevGridMultiplier.current = value
  }

  return (
    <Portal containerRef={mapRef}>
      <Slider className={'map-grid-slider'} data-testid="map-grid-slider"
              size={'sm'} colorScheme={'teal'} width={'100px'}
              defaultValue={getAverageGridMultiplier()} min={0.3} max={3} step={0.1}
              onChange={handleChange} onChangeEnd={handleChangeEnd}
      >
        <SliderTrack className={'map-grid-slider-track'} data-testid="map-grid-slider-track">
          <SliderFilledTrack/>
        </SliderTrack>
        <SliderThumb className={'map-grid-slider-thumb'} data-testid="map-grid-slider-thumb" boxSize={2.5}/>
      </Slider>
    </Portal>
  )
}
