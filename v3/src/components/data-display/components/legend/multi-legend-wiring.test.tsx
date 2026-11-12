import { render } from "@testing-library/react"
import { BaseDataDisplayModelContext } from "../../hooks/use-base-data-display-model"
import { MultiLegend } from "./multi-legend"

// capture the handlers MultiLegend passes to each layer's legend
const mockLegendProps = jest.fn()
jest.mock("./legend", () => ({
  Legend: (props: any) => {
    mockLegendProps(props)
    return null
  }
}))

jest.mock("../droppable-svg", () => ({ DroppableSvg: () => null }))
jest.mock("../../../../hooks/use-drag-drop", () => ({
  ...jest.requireActual("../../../../hooks/use-drag-drop"),
  useDropHandler: jest.fn()
}))

describe("MultiLegend", () => {
  it("passes each legend the menu's change handler and the drop handler separately", () => {
    const layer = {
      id: "LAYER1", layerIndex: 0, isVisible: true,
      dataConfiguration: { attributeID: () => "ATTR7", legendAttributeIsInoperable: false }
    }
    const dataDisplayModel = { layers: [layer], placeCanAcceptAttributeIDDrop: () => true } as any
    const onDropAttribute = jest.fn()
    const onChangeAttribute = jest.fn()
    render(
      <BaseDataDisplayModelContext.Provider value={dataDisplayModel}>
        <MultiLegend divElt={null} onDropAttribute={onDropAttribute} onChangeAttribute={onChangeAttribute} />
      </BaseDataDisplayModelContext.Provider>
    )
    const props = mockLegendProps.mock.calls.at(-1)[0]
    expect(props.onChangeAttribute).toBe(onChangeAttribute)
    expect(props.onDropAttribute).toBe(onDropAttribute)
  })
})
