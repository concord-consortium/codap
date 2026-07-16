import React from "react"

const IfThenElseContext = React.createContext<boolean | undefined>(undefined)

interface IfThenElseProps {
  condition: boolean
  children: React.ReactNode
}

interface BranchProps {
  children: React.ReactNode
}

/**
 * Conditional rendering components for better readability than the ternary operator.
 *
 * Usage:
 * ```tsx
 * <IfThenElse condition={someBoolean}>
 *   <Then>
 *     <Component />
 *   </Then>
 *   <Else>
 *     <OtherComponent />
 *   </Else>
 * </IfThenElse>
 * ```
 *
 * `<Then>` and `<Else>` read the condition from context, so they may appear at any depth
 * within `<IfThenElse>`, in either order, and either may be omitted. Like `<If>`, these
 * defer rendering of the branch not taken, but do not defer evaluation of inline
 * expressions passed as children, and do not narrow types the way a ternary does.
 */
export function IfThenElse({ condition, children }: IfThenElseProps) {
  return <IfThenElseContext.Provider value={condition}>{children}</IfThenElseContext.Provider>
}

function useCondition(component: string) {
  const condition = React.useContext(IfThenElseContext)
  if (condition === undefined) {
    throw new Error(`<${component}> must be rendered inside <IfThenElse>`)
  }
  return condition
}

export function Then({ children }: BranchProps) {
  return useCondition("Then") ? <>{children}</> : null
}

export function Else({ children }: BranchProps) {
  return useCondition("Else") ? null : <>{children}</>
}
