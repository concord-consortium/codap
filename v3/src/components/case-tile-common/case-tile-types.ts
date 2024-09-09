// used in lieu of attribute id for index column for ReactDataGrid
export const kIndexColumnKey = "__index__"

export interface IDividerProps {
  before?: boolean
  columnKey: string
  cellElt: HTMLElement | null
  isCardDivider?: boolean
}
