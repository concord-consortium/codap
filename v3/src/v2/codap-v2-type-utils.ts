import { IFormula } from "../models/formula/formula"

interface IExportV3Properties {
  filterFormula?: IFormula
}

interface IImportV3Properties {
  filterFormula?: string
}

export function exportV3Properties(props: IExportV3Properties) {
  return props.filterFormula?.display
          ? { v3: { filterFormula: props.filterFormula.display } }
          : {}
}

export function importV3Properties(props?: IImportV3Properties) {
  return props?.filterFormula
          ? { filterFormula: { display: props.filterFormula } }
          : {}
}
