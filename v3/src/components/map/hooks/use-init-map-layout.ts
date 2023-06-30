import { useMemo } from "use-memo-one"
import { MapLayout } from "../models/map-layout"
import { IMapContentModel } from "../models/map-content-model"

export function useInitMapLayout(model?: IMapContentModel) {
  const layout = useMemo(() => new MapLayout(), [])

  return layout
}
