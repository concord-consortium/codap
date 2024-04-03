import { IGlobalValue } from "../models/global/global-value"

export function valuesFromGlobal(global: IGlobalValue) {
  return {
    name: global.name,
    value: global.value,
    id: global.id
  }
}
