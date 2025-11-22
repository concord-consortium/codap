import { Flex, Editable, EditablePreview, EditableInput, Button } from "@chakra-ui/react"
import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import React, { CSSProperties, useEffect, useMemo, useRef, useState } from "react"
import { useResizeDetector } from "react-resize-detector"
import PlayIcon from "../../assets/icons/icon-play.svg"
import PauseIcon from "../../assets/icons/icon-pause.svg"
import { InstanceIdContext, useNextInstanceId } from "../../hooks/use-instance-id-context"
import { isAliveSafe } from "../../utilities/mst-utils"
import { getNumberOfLevelsForDateAxis } from "../axis/axis-utils"
import { Axis } from "../axis/components/axis"
import { AxisProviderContext } from "../axis/hooks/use-axis-provider-context"
import { AxisLayoutContext } from "../axis/models/axis-layout-context"
import { isDateAxisModel } from "../axis/models/numeric-axis-models"
import { ITileBaseProps } from "../tiles/tile-base-props"
import { EditableSliderValue } from "./editable-slider-value"
import { SliderAxisLayout } from "./slider-layout"
import { isSliderModel } from "./slider-model"
import { CodapSliderThumb } from "./slider-thumb"
import { kSliderClass } from "./slider-types"

import "./slider.scss"

const kAxisMargin = 30

export const SliderComponent = observer(function SliderComponent({ tile } : ITileBaseProps) {
  const sliderModel = isAliveSafe(tile?.content) && isSliderModel(tile?.content) ? tile?.content : undefined
  const instanceId = useNextInstanceId("slider")
  const layout = useMemo(() => new SliderAxisLayout(), [])
  const {width, height, ref: sliderRef} = useResizeDetector()
  const [running, setRunning] = useState(false)
  const multiScale = layout.getAxisMultiScale("bottom")

  // width and positioning
  useEffect(() => {
    if ((width != null) && (height != null)) {
      layout.setTileExtent(width - kAxisMargin, height)
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

  if (!sliderModel) return null

  const axisClasses = () => {
    const axisModel = sliderModel.axis,
      isDateAxis = axisModel && isDateAxisModel(axisModel),
      [min, max] = axisModel.domain,
      requires2Lines = isDateAxis && min && max && getNumberOfLevelsForDateAxis(min, max) > 1
    return clsx("slider-axis-wrapper", {"two-lines": requires2Lines})
  }

  const handleSliderNameInput = (name: string) => {
    sliderModel.setName(name)
  }

  return (
    <InstanceIdContext.Provider value={instanceId}>
      <AxisProviderContext.Provider value={sliderModel}>
        <AxisLayoutContext.Provider value={layout}>
          <div className={clsx(kSliderClass, {date: sliderModel.axisRequiresTwoLevels()})} ref={sliderRef}>
            <Flex className="slider-control">
              <Button className={`play-pause ${running ? "running" : "paused"}`} onClick={toggleRunning}
                      data-testid="slider-play-pause">
                {running ? <PauseIcon/> : <PlayIcon/>}
              </Button>
              <Flex className="slider-inputs">
                <Editable value={sliderModel.name} className="name-input" submitOnBlur={true}
                          onChange={handleSliderNameInput} data-testid="slider-variable-name">
                  <EditablePreview className="name-text" data-testid="slider-variable-name-text"/>
                  <EditableInput className="name-text-input text-input" data-testid="slider-variable-name-text-input"/>
                </Editable>
                <span className="equals-sign">&nbsp;=&nbsp;</span>
                <EditableSliderValue sliderModel={sliderModel} multiScale={multiScale}/>
              </Flex>
            </Flex>
            <div className="slider">
              <CodapSliderThumb sliderContainer={sliderRef.current} sliderModel={sliderModel}
                                running={running} setRunning={setRunning}
              />
              <div className={axisClasses()} style={axisStyle}>
                <div className="axis-end min"/>
                <svg className="slider-axis" data-testid="slider-axis">
                  <Axis
                    axisPlace={"bottom"}
                  />
                </svg>
                <div className="axis-end max"/>
              </div>
            </div>
          </div>
        </AxisLayoutContext.Provider>
      </AxisProviderContext.Provider>
    </InstanceIdContext.Provider>
  )
})
