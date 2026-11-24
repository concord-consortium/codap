// PROTOTYPE: the slider thumb, based on the original CODAP thumb (a bar with a pointer under it) but
// squarer, styled like the house Slider Thumb (#d3f4ff fill, #006c8e outline -- 2px here): a 24x24 rounded
// square body (Mike's minimum for icons, for accessibility) with a 6px pointer below it whose tip sits on
// the axis line at the value -- 24x30 overall. Each end still gets a 44x44 target (in CSS).
// A range slider uses the two halves, split down the middle through the pointer: "lower" is the left half
// and "upper" the right, each with its straight edge at the value. The halves overlap by half the
// outline (1px), so when the ends meet their straight edges draw as one 2px line.
// The keyboard focus ring (shown by CSS on .focus-visible) follows the shape, like the house thumb's
// ring follows its circle: 2px wide, 2px outside the outline.
import { observer } from "mobx-react-lite"
import { useId } from "react"
import { prototypeOptions } from "./prototype-options"

export const kThumbWidth = 24
export const kThumbHeight = 30
// how far the halves' straight edges reach past the centre: half the 2px outline
export const kThumbHalfOverlap = 1

// drawn 1px inside the 24x30 box so the 2px outline stays within it; the pointer is 10px wide
const kShape = {
  full: "M4 1H20A3 3 0 0 1 23 4V20A3 3 0 0 1 20 23H17L12 29L7 23H4A3 3 0 0 1 1 20V4A3 3 0 0 1 4 1Z",
  lower: "M12 1H4A3 3 0 0 0 1 4V20A3 3 0 0 0 4 23H7L12 29Z",
  upper: "M12 1H20A3 3 0 0 1 23 4V20A3 3 0 0 1 20 23H17L12 29Z"
}
// PROTOTYPE option (prototype-options.ts), "Thumb Decoration Style": grip lines on the thumb itself, in the
// outline's teal, 1.5px, 8px long, 3px apart, centred on the body's height (y 12) -- four across a whole thumb,
// centred on it (x 12; Mike; not two, which beside the Play/Pause button read as "pause"), two across each half of a
// range thumb (x 6.5 and 17.5). The band between the halves has its own option ("Split Thumb Decoration", in
// slider.scss).
function grip(part: "full" | "lower" | "upper") {
  const xs = part === "full" ? [7.5, 10.5, 13.5, 16.5] : part === "lower" ? [5, 8] : [16, 19]
  return <path className="decoration lines" d={xs.map(x => `M${x} 8V16`).join("")} />
}

// focus ring: the outline's outer edge is 1px out from the path; the ring runs from 2px beyond that
// (a 2px gap) to 4px beyond it (2px wide). Masking a wide stroke with a narrower one leaves that band.
const kOutlineHalf = 1
const kRingGap = 2
const kRingWidth = 2
const kRingInner = kOutlineHalf + kRingGap               // 3 from the path
const kRingOuter = kRingInner + kRingWidth               // 5 from the path
const kRingPad = Math.ceil(kRingOuter) + 1               // room around the box for the ring

interface IProps {
  part?: "full" | "lower" | "upper"
}

export const ThumbShape = observer(function ThumbShape({ part = "full" }: IProps) {
  const maskId = `thumb-focus-ring-${useId().replace(/:/g, "")}`
  const halfWidth = kThumbWidth / 2 + kThumbHalfOverlap
  const [x0, width, d] =
    part === "lower" ? [0, halfWidth, kShape.lower]
    : part === "upper" ? [kThumbWidth / 2 - kThumbHalfOverlap, halfWidth, kShape.upper]
    : [0, kThumbWidth, kShape.full]
  const ring = { x: x0 - kRingPad, y: -kRingPad, width: width + 2 * kRingPad, height: kThumbHeight + 2 * kRingPad }
  return (
    <svg className="thumb-shape" width={width} height={kThumbHeight} viewBox={`${x0} 0 ${width} ${kThumbHeight}`}
         aria-hidden="true">
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse" {...ring}>
          <path d={d} fill="white" stroke="white" strokeWidth={2 * kRingOuter} strokeLinejoin="round" />
          <path d={d} fill="black" stroke="black" strokeWidth={2 * kRingInner} strokeLinejoin="round" />
        </mask>
      </defs>
      <rect className="focus-ring" {...ring} mask={`url(#${maskId})`} />
      <path className="shape" d={d} />
      {prototypeOptions.thumbDecoration === "lines" && grip(part)}
    </svg>
  )
})
