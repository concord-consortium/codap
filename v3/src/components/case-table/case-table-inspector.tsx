import { CaseTileInspector } from "../case-tile-common/inspector-panel/case-tile-inspector"
import { ITileInspectorPanelProps } from "../tiles/tile-base-props"

export function CaseTableInspector(props: ITileInspectorPanelProps) {
  return <CaseTileInspector showResizeColumnsButton={true} {...props} />
}
