import { useEffect } from "react"
import { useDeepCompareMemo } from "use-deep-compare"
import { useMemo } from "use-memo-one"
import { useCallbackRef } from "./use-callback-ref"

type Signature = (target: HTMLElement | null, options: MutationObserverInit, callback: MutationCallback) => void

export const useMutationObserver: Signature = (target, _options, _callback) => {
  const options = useDeepCompareMemo(() => _options, [_options])
  const callback = useCallbackRef(_callback)
  const observer = useMemo(() => new MutationObserver(callback), [callback])

  useEffect(() => {
    if (target) {
      observer.observe(target, options)
      return () => observer.disconnect()
    }
  }, [observer, options, target])
}
