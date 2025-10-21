import { observable, runInAction } from "mobx"
import { useCallback } from "react"
import { useMemo } from "use-memo-one"

export function useMobXObservableValue<T>(): [() => Maybe<T>, (value: Maybe<T>) => void] {
  const observableValue = useMemo(() => observable.box<Maybe<T>>(), [])
  const getValue = useCallback(() => observableValue.get(), [observableValue])
  const setValue = useCallback((value: Maybe<T>) => {
    runInAction(() => {
      observableValue.set(value)
    })
  }, [observableValue])
  return [getValue, setValue]
}
