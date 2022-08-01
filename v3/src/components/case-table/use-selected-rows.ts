import { autorun } from "mobx"
import { useCallback, useEffect, useRef, useState } from "react"
import { IDataSet } from "../../data-model/data-set"

export const useSelectedRows = (data?: IDataSet) => {
  const [selectedRows, _setSelectedRows] = useState<ReadonlySet<string>>(() => new Set())
  const syncCount = useRef(0)

  // sync table changes to the model
  const setSelectedRows = useCallback((rowSet: ReadonlySet<string>) => {
    const rows = Array.from(rowSet)
    ++syncCount.current
    data?.setSelectedCases(rows)
    --syncCount.current
    _setSelectedRows(rowSet)
  }, [data])

  useEffect(() => {
    // sync model changes to selectedRows state
    const disposer = autorun(() => {
      // don't respond if we caused the change
      if (syncCount.current === 0) {
        _setSelectedRows(new Set<string>(data?.selection.keys()))
      }
    })
    return () => disposer()
  }, [data?.selection])

  return [selectedRows, setSelectedRows] as const
}
