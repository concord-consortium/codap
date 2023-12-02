import { useMemo } from "use-memo-one"
import { DataDisplayLayout } from "../../data-display/models/data-display-layout"
import { IMapContentModel } from "../models/map-content-model"

export function useInitMapLayout(model?: IMapContentModel) {
  const layout = useMemo(() => new DataDisplayLayout(), [])

  return layout
}
