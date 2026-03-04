import { ReactNode } from "react"
import { Checkbox, type CheckboxProps } from "react-aria-components"

interface PaletteCheckboxProps extends Omit<CheckboxProps, "children"> {
  children: ReactNode
}

export function PaletteCheckbox({ children, ...props }: PaletteCheckboxProps) {
  return (
    <Checkbox {...props}>
      {() => (
        <>
          <div className="checkbox-indicator" />
          {children}
        </>
      )}
    </Checkbox>
  )
}
