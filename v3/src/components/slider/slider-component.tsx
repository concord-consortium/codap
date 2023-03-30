import React, { CSSProperties, useEffect, useMemo, useRef, useState } from "react"
import { useResizeDetector } from "react-resize-detector"
import { Flex, Center } from "@chakra-ui/react"
import { observer } from "mobx-react-lite"
import PlayIcon from "../../assets/icons/icon-play.svg"
import PauseIcon from "../../assets/icons/icon-pause.svg"
import { SliderAxisLayout } from "./slider-layout"
import { isSliderModel } from "./slider-model"
import { kSliderClass, kSliderClassSelector } from "./slider-types"
import { measureText } from "../../hooks/use-measure-text"
import { Axis } from "../axis/components/axis"
import { AxisLayoutContext } from "../axis/models/axis-layout-context"
import { InstanceIdContext, useNextInstanceId } from "../../hooks/use-instance-id-context"
import { ITileBaseProps } from "../tiles/tile-base-props"
import { uiState } from "../../models/ui-state"
import { CodapSliderThumb } from "./slider-thumb"
import { EditableSliderValue } from "./editable-slider-value"
import { SliderInspector } from "./slider-inspector"

import './slider.scss'

export const SliderComponent = observer(function SliderComponent({ tile } : ITileBaseProps) {
  const sliderModel = tile?.content
  const instanceId = useNextInstanceId("slider")
  const layout = useMemo(() => new SliderAxisLayout(), [])
  const {width, height, ref: sliderRef} = useResizeDetector()
  const [running, setRunning] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const intervalRef = useRef<any>()
  const tickTime = 60
  const animationRef = useRef(false)

  // width and positioning
  useEffect(() => {
    if ((width != null) && (height != null)) {
      layout.setParentExtent(width, height)
    }
  }, [width, height, layout])

  const axisStyle: CSSProperties = {
    position: "absolute",
    left: 0,
    top: 52,
    width,
    height: 30
  }

  // control slider value with play/pause
  useEffect(() => {
    intervalRef.current = setInterval(() => { running && incrementSliderValue() }, tickTime)
    return () => clearInterval(intervalRef.current)
  })

  const toggleRunning = () => {
    setRunning(!running)
  }

  const appRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    appRef.current = document.querySelector(".app")
  }, [])

  if (!isSliderModel(sliderModel)) return null

  const incrementSliderValue = () => {
    sliderModel.setValue(sliderModel.value + sliderModel.increment)
  }

  const titleM = measureText(sliderModel.name)

  const handleSliderNameInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    sliderModel.setName(e.target.value)
  }

  return (
    <InstanceIdContext.Provider value={instanceId}>
      <AxisLayoutContext.Provider value={layout}>
        <div className={kSliderClass} ref={sliderRef}>
          <div className="slider">

            <Flex>
              <Center w="40px">
                <button className={`play-pause ${ running ? "running" : "paused"}`} onClick={toggleRunning}>
                  { running ? <PauseIcon /> : <PlayIcon /> }
                </button>
              </Center>
              <Center>
                <div className="slider-inputs">
                  { isEditingName
                    ? <input
                        type="text"
                        className="name-input"
                        value={sliderModel.name}
                        onChange={handleSliderNameInput}
                        onBlur={() => setIsEditingName(false)}
                        style={{width: `${titleM + 2 + (titleM * .25)}px`, paddingLeft: "3px"}}
                      />
                    : <div onClick={() => setIsEditingName(true)}>
                        {sliderModel.name}
                      </div>
                  }

                  <span className="equals-sign">&nbsp;=&nbsp;</span>

                  <EditableSliderValue sliderModel={sliderModel} />

                </div>
              </Center>
            </Flex>

            <svg style={axisStyle}>
              <Axis
                parentSelector={kSliderClassSelector}
                getAxisModel={() => sliderModel.axis}
                enableAnimation={animationRef}
              />
            </svg>

            <CodapSliderThumb sliderContainer={sliderRef.current} sliderModel={sliderModel} />

          </div>
        </div>
        <SliderInspector sliderModel={sliderModel} show={uiState.isFocusedTile(tile?.id)}/>
      </AxisLayoutContext.Provider>
    </InstanceIdContext.Provider>
  )
})
