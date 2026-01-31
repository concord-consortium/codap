import { observer } from "mobx-react-lite"
import { DataSetMetadataContext } from "../../hooks/use-data-set-metadata"
import { useDataSet } from "../../hooks/use-data-set"
import { DataSetContext } from "../../hooks/use-data-set-context"
import { InstanceIdContext, useNextInstanceId } from "../../hooks/use-instance-id-context"
import { registerTileCollisionDetection } from "../../lib/dnd-kit/dnd-detect-collision"
import { ITileBaseProps } from "../tiles/tile-base-props"
import { CaseTable } from "./case-table"
import { caseTableCollisionDetection } from "./case-table-drag-drop"
import { ICaseTableModel, isCaseTableModel } from "./case-table-model"
import { kCaseTableIdBase } from "./case-table-types"
import { CaseTableModelContext } from "./use-case-table-model"

registerTileCollisionDetection(kCaseTableIdBase, caseTableCollisionDetection)

export const CaseTableComponent = observer(function CaseTableComponent({ tile }: ITileBaseProps) {
  const instanceId = useNextInstanceId(kCaseTableIdBase)

  const tableModel: ICaseTableModel | undefined = isCaseTableModel(tile?.content) ? tile?.content : undefined
  const { data, metadata } = useDataSet(tableModel?.data, tableModel?.metadata)

  if (!tableModel) return null

  return (
    <InstanceIdContext.Provider value={instanceId}>
      <DataSetContext.Provider value={data}>
        <DataSetMetadataContext.Provider value={metadata}>
          <CaseTableModelContext.Provider value={tableModel}>
            <CaseTable />
          </CaseTableModelContext.Provider>
        </DataSetMetadataContext.Provider>
      </DataSetContext.Provider>
    </InstanceIdContext.Provider>
  )
})
