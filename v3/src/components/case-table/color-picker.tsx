import React from "react"
import { HexAlphaColorPicker } from "react-colorful"

// copied from react-colorful because it's not exported
type ColorPickerHTMLAttributes =
  Omit<React.HTMLAttributes<HTMLDivElement>, "color" | "onChange" | "onChangeCapture">
export interface ColorPickerProps extends ColorPickerHTMLAttributes {
    color?: string;
    onChange?: (newColor: string) => void;
}
export function ColorPicker(props: ColorPickerProps) {
  return <HexAlphaColorPicker {...props} />
}
