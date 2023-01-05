// import all tools so they are registered
import "./models/tiles/placeholder/placeholder-registration"
import "./models/tiles/unknown-content-registration"

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
