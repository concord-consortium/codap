import {ITileModelSnapshotIn} from "../../models/tiles/tile-model"
import {toV3AttrId, toV3Id} from "../../utilities/codap-utils"
import {V2TileImportArgs} from "../../v2/codap-v2-tile-importers"
import { isV2CalculatorComponent } from "../../v2/codap-v2-types"
import { kCalculatorIdPrefix } from "./calculator-registration"

export function v2CalculatorImporter({v2Component, v2Document, getCaseData, insertTile}: V2TileImportArgs) {
  if (isV2CalculatorComponent(v2Component)) {

/*
    const {guid, componentStorage: {name, title, userSetTitle, cannotClose}} = v2Component

    const calculatorTileSnap: ITileModelSnapshotIn =
      {id: toV3Id(kCalculatorIdPrefix, guid), name, _title: title, userSetTitle, content, cannotClose}
    return insertTile(calculatorTileSnap)
*/
  }
}
