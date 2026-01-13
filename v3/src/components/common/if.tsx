import React from "react"

interface IfProps {
  condition: boolean
  children: React.ReactNode
}

/**
 * Conditional rendering component for better readability than `&&` operator.
 *
 * Usage:
 * ```tsx
 * <If condition={someBoolean}>
 *   <Component />
 * </If>
 * ```
 */
export function If({ condition, children }: IfProps) {
  return condition ? <>{children}</> : null
}
