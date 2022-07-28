import { useRef } from "react"

/*
 * A nearly trivial hook that helps solve the stale closure problem.
 */
export function useCurrent<T>(value: T) {
  const ref = useRef(value)
  ref.current = value
  return ref
}
