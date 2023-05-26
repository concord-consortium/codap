import React, { CSSProperties, useEffect, useMemo, useRef, useState } from "react"
import { useResizeDetector } from "react-resize-detector"
import { Flex, Editable, EditablePreview, EditableInput, Button } from "@chakra-ui/react"
import { observer } from "mobx-react-lite"
import PlayIcon from "../../assets/icons/icon-play.svg"
import PauseIcon from "../../assets/icons/icon-pause.svg"
import { SliderAxisLayout } from "./slider-layout"
import { isSliderModel } from "./slider-model"
import { kSliderClass } from "./slider-types"
import { Axis } from "../axis/components/axis"
import { AxisLayoutContext } from "../axis/models/axis-layout-context"
import { InstanceIdContext, useNextInstanceId } from "../../hooks/use-instance-id-context"
import { ITileBaseProps } from "../tiles/tile-base-props"
import { CodapSliderThumb } from "./slider-thumb"
import { EditableSliderValue } from "./editable-slider-value"

import './slider.scss'

const kAxisMargin = 30
const kComponentTitleHeight = 25
const kSliderComponentHeight = 98

export const SliderComponent = observer(function SliderComponent({ tile } : ITileBaseProps) {
  const sliderModel = tile?.content
  const instanceId = useNextInstanceId("slider")
  const layout = useMemo(() => new SliderAxisLayout(), [])
  const {width, height, ref: sliderRef} = useResizeDetector()
  const [running, setRunning] = useState(false)
  const animationRef = useRef(true)
  const multiScale = layout.getAxisMultiScale("bottom")

  // width and positioning
  useEffect(() => {
    if ((width != null) && (height != null)) {
      layout.setParentExtent(width - kAxisMargin, height)
    }
  }, [width, height, layout])

  const axisStyle: CSSProperties = {
    width: width ? width - kAxisMargin : width,
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

  const style = {height: tile?.isMinimized ? 0 : kSliderComponentHeight - kComponentTitleHeight}

  return (
    <InstanceIdContext.Provider value={instanceId}>
      <AxisLayoutContext.Provider value={layout}>
        <div className={kSliderClass} style={style} ref={sliderRef}>
          <Flex className="slider-control">
            <Button className={`play-pause ${ running ? "running" : "paused"}`} onClick={toggleRunning}>
              { running ? <PauseIcon /> : <PlayIcon /> }
            </Button>
            <Flex className="slider-inputs">
              <Editable value={sliderModel.name} className="name-input" submitOnBlur={true}
                  onChange={handleSliderNameInput} data-testid="slider-variable-name">
                <EditablePreview className="name-text"/>
                <EditableInput className="name-text-input text-input"/>
              </Editable>
              <span className="equals-sign">&nbsp;=&nbsp;</span>
              <EditableSliderValue sliderModel={sliderModel} multiScale={multiScale} />
            </Flex>
          </Flex>
          <div className="slider">
            <CodapSliderThumb sliderContainer={sliderRef.current} sliderModel={sliderModel}
              running={running} setRunning={setRunning}
            />
            <div className="slider-axis-wrapper" style={axisStyle}>
              <div className="axis-end min" />
              <svg className="slider-axis">
                <Axis
                  getAxisModel={() => sliderModel.axis}
                  enableAnimation={animationRef}
                />
              </svg>
              <div className="axis-end max" />
            </div>
          </div>
        </div>
      </AxisLayoutContext.Provider>
    </InstanceIdContext.Provider>
  )
})
