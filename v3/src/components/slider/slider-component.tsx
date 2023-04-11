import React, { CSSProperties, useEffect, useMemo, useRef, useState } from "react"
import { useResizeDetector } from "react-resize-detector"
import { Flex, Editable, EditablePreview, EditableInput, Button } from "@chakra-ui/react"
import { observer } from "mobx-react-lite"
import PlayIcon from "../../assets/icons/icon-play.svg"
import PauseIcon from "../../assets/icons/icon-pause.svg"
import { SliderAxisLayout } from "./slider-layout"
import { isSliderModel } from "./slider-model"
import { kSliderClass, kSliderClassSelector } from "./slider-types"
import { Axis } from "../axis/components/axis"
import { AxisLayoutContext } from "../axis/models/axis-layout-context"
import { InstanceIdContext, useNextInstanceId } from "../../hooks/use-instance-id-context"
import { ITileBaseProps } from "../tiles/tile-base-props"
import { CodapSliderThumb } from "./slider-thumb"
import { EditableSliderValue } from "./editable-slider-value"

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
    width,
    height: 30
  }

  const toggleRunning = () => {
    setRunning(!running)
  }

  const appRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    appRef.current = document.querySelector(".app")
  }, [])

  if (!isSliderModel(sliderModel)) return null

  const handleSliderNameInput = (name: string) => {
    sliderModel.setName(name)
  }

  return (
    <InstanceIdContext.Provider value={instanceId}>
      <AxisLayoutContext.Provider value={layout}>
        <div className={kSliderClass} ref={sliderRef}>
          <Flex className="slider-control">
            <Flex>
              <Flex>
                <Button className={`play-pause ${ running ? "running" : "paused"}`} onClick={toggleRunning}>
                  { running ? <PauseIcon /> : <PlayIcon /> }
                </Button>
              </Flex>
              <Flex className="slider-inputs">
                <Flex>
                  <Editable value={sliderModel.name} className="name-input" submitOnBlur={true}
                      onChange={handleSliderNameInput} data-testid="slider-variable-name">
                    <EditablePreview className="name-text"/>
                    <EditableInput className="name-text-input text-input"/>
                  </Editable>
                </Flex>
                <Flex>
                  <span className="equals-sign">&nbsp;=&nbsp;</span>
                  <EditableSliderValue sliderModel={sliderModel} />
                </Flex>
              </Flex>
            </Flex>
          </Flex>
          <div className="slider">
            <CodapSliderThumb sliderContainer={sliderRef.current} sliderModel={sliderModel}
              running={running} setRunning={setRunning}
             />
            <svg style={axisStyle}>
              <Axis
                parentSelector={kSliderClassSelector}
                getAxisModel={() => sliderModel.axis}
                enableAnimation={animationRef}
              />
            </svg>
          </div>
        </div>
      </AxisLayoutContext.Provider>
    </InstanceIdContext.Provider>
  )
})
