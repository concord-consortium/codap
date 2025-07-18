// import all tools so they are registered
import "./models/tiles/placeholder/placeholder-registration"
import "./models/tiles/unknown-content-registration"

import "./components/case-table/case-table-registration"
import "./components/case-card/case-card-registration"
import "./components/graph/graph-registration"
import "./components/slider/slider-registration"
import "./components/calculator/calculator-registration"
import "./components/text/text-registration"
import "./components/map/map-registration"
import "./components/web-view/web-view-registration"
// This will only be registered if the errorTester URL parameter is set
import "./components/error-tester/error-tester-registration"

const gTileRegistration: Record<string, () => void> = {
  // "Table": () => Promise.all([
  //   import(/* webpackChunkName: "Table" */"./models/tiles/table/table-registration"),
  //   import(/* webpackChunkName: "SharedDataSet" */"./models/shared/shared-data-set-registration")
  // ]),
  // "Text": () => import(/* webpackChunkName: "Text" */"./models/tiles/text/text-registration")
}

export function registerTileTypes(tileTypeIds: string[]) {
  return Promise.all(tileTypeIds.map(id => gTileRegistration[id]?.()))
}
