import {useCallback, useState} from "react"

/*
 * For those rare times you really need to force a component to re-render.
 */
export const useForceUpdate = () => {
  const set = useState(false)[1]
  return useCallback(() => set((s) => !s), [set])
}

