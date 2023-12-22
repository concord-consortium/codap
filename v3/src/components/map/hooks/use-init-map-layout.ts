import {useMemo} from "use-memo-one"
import {DataDisplayLayout} from "../../data-display/models/data-display-layout"
import {IMapContentModel} from "../models/map-content-model"
import {kDefaultMapHeight, kDefaultMapWidth} from "../map-types"

export function useInitMapLayout(model?: IMapContentModel) {
  return useMemo(() => new DataDisplayLayout({
    tileWidth: kDefaultMapWidth,
    tileHeight: kDefaultMapHeight
  }), [])
}
