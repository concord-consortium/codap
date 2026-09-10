import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import React, { useEffect, useRef, useState } from "react"
import { Button, ListBox, ListBoxItem, Popover, Select, SelectValue } from "react-aria-components"
import CircleIcon from "../../../assets/icons/point-shapes/point-circle.nosvgo.svg"
import DiamondIcon from "../../../assets/icons/point-shapes/point-diamond.nosvgo.svg"
import PlusIcon from "../../../assets/icons/point-shapes/point-plus.nosvgo.svg"
import SquareIcon from "../../../assets/icons/point-shapes/point-square.nosvgo.svg"
import StarIcon from "../../../assets/icons/point-shapes/point-star.nosvgo.svg"
import TriangleIcon from "../../../assets/icons/point-shapes/point-triangle.nosvgo.svg"
import XIcon from "../../../assets/icons/point-shapes/point-x.nosvgo.svg"
import { PointShape, PointShapes } from "../../../utilities/point-shape-utils"
import { t } from "../../../utilities/translation/translate"

const kShapeIcons: Record<PointShape, React.FC<React.SVGProps<SVGSVGElement>>> = {
  circle: CircleIcon,
  square: SquareIcon,
  triangle: TriangleIcon,
  diamond: DiamondIcon,
  star: StarIcon,
  plus: PlusIcon,
  x: XIcon
}

export function shapeLabel(shape: PointShape) {
  return t(`V3.Inspector.pointShape.${shape}`)
}

type IShapeIconProps = React.SVGProps<SVGSVGElement> & {
  shape: PointShape
}

// The glyph is decorative: the control that renders it supplies the accessible name. Its fill is
// currentColor, so whatever sets `color` on it — the row passes the category's color — tints it.
function ShapeIcon({ shape, ...svgProps }: IShapeIconProps) {
  const Icon = kShapeIcons[shape]
  return <Icon aria-hidden="true" focusable="false" {...svgProps} />
}

interface IPointShapeSettingProps {
  // changes to this value close an open menu, so a menu cannot be left floating over a scrolled row
  closeTrigger?: number
  color?: string
  /*
   * Paints the glyphs with the gradient of this id instead of a solid color, for a legend whose
   * points span a range rather than sharing one. The menu takes it as well as the trigger: each
   * option previews the points that choosing it would produce, and with such a legend that preview
   * is the range, not any one color of it.
   */
  fillGradientId?: string
  disabled?: boolean
  onShapeChange: (shape: PointShape) => void
  propertyLabel: string
  shape: PointShape
}

export const PointShapeSetting = observer(function PointShapeSetting({
  closeTrigger, color, disabled, fillGradientId, onShapeChange, propertyLabel, shape
}: IPointShapeSettingProps) {
  /*
   * The glyph's fill is `currentColor`, which cannot hold a gradient, so the stylesheet points the
   * path at a custom property instead. Setting it here overrides the solid color; leaving it unset
   * falls back to `currentColor`, which is what every glyph outside a numeric legend uses.
   */
  const glyphStyle = { color, ...(fillGradientId ? { "--point-shape-fill": `url(#${fillGradientId})` } : {}) }
  const [isOpen, setIsOpen] = useState(false)
  const lastCloseTrigger = useRef(closeTrigger)

  // Closes the menu when the surrounding list scrolls, so it cannot be left floating away from
  // its row. Compares against the previous value rather than firing on every render, so mounting
  // does not count as a scroll.
  useEffect(() => {
    if (closeTrigger !== lastCloseTrigger.current) {
      lastCloseTrigger.current = closeTrigger
      setIsOpen(false)
    }
  }, [closeTrigger])

  const handleChange = (key: React.Key | null) => {
    if (key == null) return
    onShapeChange(key as PointShape)
  }

  return (
    <Select
      aria-label={propertyLabel}
      isDisabled={disabled}
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      onSelectionChange={handleChange}
      selectedKey={shape}
      data-testid="point-shape-select"
    >
      {/*
        * Icon only. With an icon and a text label the category name is squeezed to about 55px and
        * a value like "water" truncates; the open menu carries the labels instead.
        */}
      <Button className={clsx("point-shape-thumb", { open: isOpen })} excludeFromTabOrder={disabled}>
        {/* The span is a plain 24x24 flex item; the glyph is pinned inside it with inset: 0
            rather than laid out, so nothing about how an svg participates in flex layout can
            displace it. */}
        <span className="point-shape-thumb-value">
          <ShapeIcon shape={shape} className="point-shape-thumb-glyph"
            data-testid="point-shape-glyph" style={glyphStyle} />
        </span>
        {/*
          * Names the current shape for assistive technology, and gives the aria-labelledby that
          * react-aria puts on the trigger a real element to point at. Without it that reference
          * dangles, and the accessible name survives only by falling back to aria-label.
          *
          * Text only. Rendering the selected item's own children would put a second copy of the
          * glyph in here, and this span is positioned absolutely, so those copies would escape
          * the button and pile up over the palette.
          */}
        <SelectValue className="codap-visually-hidden">
          {({ selectedText }) => selectedText}
        </SelectValue>
        {/* A real element, as in the prototype, rather than a pseudo-element: a zero-size bordered
            ::after collapses wherever box-sizing is border-box. */}
        <span className="point-shape-arrow" aria-hidden="true" />
      </Button>
      {/*
        * WORKAROUND -- remove shouldFlip once popover flipping is fixed, and let the menu flip.
        *
        * A menu react-aria decides to flip above the trigger does not render at all. That leaves
        * the control unusable rather than merely awkward: with the palette near the bottom of the
        * window there is no room below, so the menu could never be opened. Pinned below the
        * trigger it always appears, clipping and scrolling within its own max-height, which is
        * the lesser failure.
        *
        * The colour picker in this same palette disables flipping for the same reason, so the
        * fault lies in how popovers position within the palette rather than in this control.
        */}
      <Popover shouldFlip={false}
        className={({ defaultClassName }) => `${defaultClassName} point-shape-popover`}>
        <ListBox>
          {PointShapes.map(_shape => (
            <ListBoxItem key={_shape} id={_shape} textValue={shapeLabel(_shape)}>
              {/* Same containment as the trigger: the span is the flex item, the glyph is
                  pinned inside it. */}
              <span className="point-shape-item-glyph">
                <ShapeIcon shape={_shape} className="point-shape-item-svg"
                  data-testid="point-shape-glyph" style={glyphStyle} />
              </span>
              <span className="point-shape-item-label">{shapeLabel(_shape)}</span>
            </ListBoxItem>
          ))}
        </ListBox>
      </Popover>
    </Select>
  )
})

PointShapeSetting.displayName = "PointShapeSetting"
