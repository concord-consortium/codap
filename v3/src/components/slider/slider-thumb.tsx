import { observer } from "mobx-react-lite"
import React, {CSSProperties, useEffect, useState} from "react"
import {ISliderModel} from "./slider-model"
import { ScaleNumericBaseType } from "../axis/axis-types"
import { useAxisLayoutContext } from "../axis/models/axis-layout-context"
import ThumbIcon from "../../assets/icons/icon-thumb.svg"

import './slider.scss'

interface IProps {
  sliderModel: ISliderModel
}

const getClientX = (elt: any) => {
  const { x } = elt.getBoundingClientRect()
  return x
}

export const CodapSliderThumb = observer(({sliderModel} : IProps) => {
  const layout = useAxisLayoutContext()
  const length = layout.getAxisLength("bottom")
  const scale = layout.getAxisScale("bottom") as ScaleNumericBaseType
  const [thumbPos, setThumbPos] = useState(0)
  const [initialThumbX, setInitialThumbX] = useState(0)
  const [newSliderValueCandidate, setNewSliderValueCandidate] = useState(.5)

  // when sliderModel.value changes, the thumb position changes
  useEffect(() => {
    const kThumbOffset = 8
    setThumbPos(scale(sliderModel.value) - kThumbOffset)
  }, [length, scale, sliderModel.domain, sliderModel.value])


  useEffect(() => {
    console.log(newSliderValueCandidate)
    sliderModel.setValue(newSliderValueCandidate)
  },[newSliderValueCandidate])

  // get and store in state the initial clientX position of thumb, as we init with 0 before model is here?
  useEffect(() => {
    const thumb = document.querySelector(".slider-thumb-svg") // use ref?
    if (thumb) {
      setInitialThumbX(getClientX(thumb))
    }
  },[])

  const thumbStyle: CSSProperties = {
    position: "absolute",
    left: thumbPos,
    top: 60,
  }

  const handlePointerMove = (e: any) => {
    const objecto = {
      //initialThumbX 687
      //thumbPos,
      // "C currentMouseXPos": e.clientX.toFixed(3),
      "1 sliderModel.value": sliderModel.value,
      "2 scale(sliderModel.value)": scale(sliderModel.value) + "px",
// is this is pixel value from left!
      "3 thumbPos (scaled - 8)": thumbPos + "px",
      "4 pixels back to value: ": scale.invert(scale(sliderModel.value)),
      "5 mouse delta in pixels: ": e.clientX - initialThumbX - 8,
      "6 that change represents a value change of: ": scale.invert(e.clientX - initialThumbX - 8),
      "7 so new sliderModel value should be += that change: ": sliderModel.value + scale.invert(e.clientX - initialThumbX - 8),
      //"so measured change in pixels: " : e.clientX - initialThumbX,
     // "can be converted to change in value: " : scale.invert(e.clientX - initialThumbX),
      // "T scale.invert(thumbPos)": scale.invert(thumbPos).toFixed(3),
      // "D delta": (e.clientX - initialThumbX).toFixed(3),
      // "D scale(delta)": scale(e.clientX - initialThumbX).toFixed(3),
      // "D invert(scale(delta))": scale.invert(e.clientX - initialThumbX).toFixed(3)
    }
    //console.table({objecto})
    const maybeValue = sliderModel.value + scale.invert(e.clientX - initialThumbX - 8)
    console.log("maybe val: ", maybeValue)
    setNewSliderValueCandidate(maybeValue)    //sliderModel.setValue(sliderModel.value + scale.invert(e.clientX - initialThumbX - 8))
    //sliderModel.setValue(scale.invert(e.clientX + initialThumbX))
    // const currentMouseXPos = e.clientX
    // //console.log("InitialThumbX: ", initialThumbX, " vs ", "currentMouseXPos: ", currentMouseXPos)
    // const delta = currentMouseXPos - initialThumbX
    // console.log("delta: ", delta)
    //const scaledChange = scale.invert(e.clientX - initialThumbX)
    //console.log("scaledChange: ", scaledChange)
    //sliderModel.setValue(sliderModel.value + scaledChange)
  }

  const addListenerToThumb = (e: React.PointerEvent) => {
    const thumb = e.currentTarget as HTMLElement
    setInitialThumbX(getClientX(thumb))
    thumb.addEventListener("pointermove", handlePointerMove)
  }

  return (
    <>
    {newSliderValueCandidate}
     <ThumbIcon
      onPointerDown={addListenerToThumb}
      style={thumbStyle}
      className="slider-thumb-svg"
    />

    </>

  )
})