import { IFormula } from "../formula/formula"

export interface IAttribute {
  id: string;
  name: string;
  title: string;
  strValues: string[]
  // The official return type is number, but in reality it can be undefined
  numValue(index: number): number | undefined
  formula?: IFormula
  hasFormula: boolean
  hasValidFormula: boolean
}

export interface IAttributeWithFormula extends IAttribute {
  formula: IFormula
}

export function isFormulaAttr(attr?: IAttribute): attr is IAttributeWithFormula {
  return !!attr?.hasFormula
}

export function isValidFormulaAttr(attr?: IAttribute): attr is IAttributeWithFormula {
  return !!attr?.hasValidFormula
}
