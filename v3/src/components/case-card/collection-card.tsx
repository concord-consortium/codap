import { observer } from "mobx-react-lite"
import { useCollectionContext } from "../../hooks/use-collection-context"
import { useDataSetContext } from "../../hooks/use-data-set-context"
// import { useForceUpdate } from "../../hooks/use-force-update"
// import { useTileModelContext } from "../../hooks/use-tile-model-context"
import { IDataSet } from "../../models/data/data-set"
// import { useCaseCardModel } from "./use-case-card-model"
// import { useCollectionCardModel } from "./use-collection-card-model"

import "react-data-grid/lib/styles.css"
// import styles from "./case-card-shared.scss"

type OnNewCollectionDropFn = (dataSet: IDataSet, attrId: string, beforeCollectionId: string) => void

interface IProps {
  onMount: (collectionId: string) => void
  onNewCollectionDrop: OnNewCollectionDropFn
}
export const CollectionCard = observer(function CollectionCard(props: IProps) {
  // const { onNewCollectionDrop } = props
  const data = useDataSetContext()
  const collectionId = useCollectionContext()
  // const caseCardModel = useCaseCardModel()
  // const collectionTableModel = useCollectionCardModel()
  // const { isTileSelected } = useTileModelContext()
  // const isFocused = isTileSelected()
  // const forceUpdate = useForceUpdate()

  // const handleNewCollectionDrop = useCallback((dataSet: IDataSet, attrId: string) => {
  //   const attr = dataSet.attrFromID(attrId)
  //   attr && onNewCollectionDrop(dataSet, attrId, collectionId)
  // }, [collectionId, onNewCollectionDrop])

  if (!data) return null

  return (
    <div className={`collection-card collection-${collectionId}`}>
      {/*<CollectionCardSpacer onDrop={handleNewCollectionDrop} />*/}
      <div className="collection-card-and-title">
{/*
        <CollectionTitle />
        <DataGrid ref={gridRef} className="rdg-light" data-testid="collection-card-grid"
          columns={columns} rows={rows} headerRowHeight={+styles.headerRowHeight} rowKeyGetter={rowKey}
          rowHeight={+styles.bodyRowHeight} selectedRows={selectedRows} onSelectedRowsChange={setSelectedRows}
          columnWidths={columnWidths.current} onColumnResize={handleColumnResize}
          onCellClick={handleCellClick} onRowsChange={handleRowsChange} onScroll={handleGridScroll}/>
*/}
      </div>
    </div>
  )
})
