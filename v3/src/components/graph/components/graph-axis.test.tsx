import { render } from "@testing-library/react"
import { GraphContentModelContext } from "../hooks/use-graph-content-model-context"
import { GraphLayoutContext } from "../hooks/use-graph-layout-context"
import { GraphContentModel } from "../models/graph-content-model"
import { GraphLayout } from "../models/graph-layout"
import { GraphAxis } from "./graph-axis"

// capture the handlers the axis passes to its attribute label (and through it to the attribute menu)
const mockLabelProps = jest.fn()
jest.mock("./graph-attribute-label", () => ({
  GraphAttributeLabel: (props: any) => {
    mockLabelProps(props)
    return null
  }
}))
jest.mock("./droppable-axis", () => ({ DroppableAxis: () => null }))
jest.mock("../../axis/components/axis", () => ({ Axis: () => null }))
jest.mock("../../../hooks/use-drag-drop", () => ({
  ...jest.requireActual("../../../hooks/use-drag-drop"),
  useDropHandler: jest.fn()
}))

describe("GraphAxis", () => {
  it("gives the attribute label the menu's change handler, not the drop handler", () => {
    const graphModel = GraphContentModel.create()
    const layout = new GraphLayout()
    const onDropAttribute = jest.fn()
    const onChangeAttribute = jest.fn()
    const onRemoveAttribute = jest.fn()
    render(
      <GraphContentModelContext.Provider value={graphModel}>
        <GraphLayoutContext.Provider value={layout}>
          <svg>
            <GraphAxis place="bottom" onDropAttribute={onDropAttribute} onChangeAttribute={onChangeAttribute}
                       onRemoveAttribute={onRemoveAttribute} />
          </svg>
        </GraphLayoutContext.Provider>
      </GraphContentModelContext.Provider>
    )
    const props = mockLabelProps.mock.calls.at(-1)[0]
    expect(props.onChangeAttribute).toBe(onChangeAttribute)
    expect(props.onRemoveAttribute).toBe(onRemoveAttribute)
  })
})
