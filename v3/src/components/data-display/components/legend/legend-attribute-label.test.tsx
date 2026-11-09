import { act, render } from "@testing-library/react"
import React from "react"
import { TileModelContext } from "../../../../hooks/use-tile-model-context"
import { TileSelectionContext } from "../../../../hooks/use-tile-selection-context"
import { DataConfigurationContext } from "../../hooks/use-data-configuration-context"
import { LegendAttributeLabel } from "./legend-attribute-label"

// capture the handlers the label passes to the attribute menu
const mockAttributeLabelProps = jest.fn()
jest.mock("../attribute-label", () => ({
  AttributeLabel: React.forwardRef(function MockAttributeLabel(props: any, ref: React.ForwardedRef<SVGGElement>) {
    mockAttributeLabelProps(props)
    return <g ref={ref} />
  })
}))

// jsdom has no SVG layout
jest.mock("../../../axis/axis-utils", () => ({
  ...jest.requireActual("../../../axis/axis-utils"),
  renderLabelBackground: jest.fn()
}))

jest.mock("../../../../models/tiles/tile-notifications", () => ({
  updateTileNotification: (operation: string, values: any, tile: any) =>
    tile && { message: { action: "notify", resource: "component", values: { operation, ...values, id: 1 } } }
}))

describe("LegendAttributeLabel", () => {
  const tile = { id: "GRAPH1", content: { type: "Graph" } } as any
  const applyModelChange = jest.fn((action: () => void, _options?: any) => action())
  const dataConfiguration = {
    assignedLegendAttributeID: "ATTR7",
    dataset: { attrFromID: () => ({ name: "Habitat" }) },
    setAttribute: jest.fn(),
    applyModelChange
  } as any
  const tileSelection = { isTileSelected: () => false, selectTile: jest.fn(), addFocusIgnoreFn: () => () => undefined }

  beforeEach(() => jest.clearAllMocks())

  function renderLabel(onChangeAttribute = jest.fn()) {
    render(
      <TileModelContext.Provider value={tile}>
        <TileSelectionContext.Provider value={tileSelection}>
          <DataConfigurationContext.Provider value={dataConfiguration}>
            <svg><LegendAttributeLabel onChangeAttribute={onChangeAttribute} /></svg>
          </DataConfigurationContext.Provider>
        </TileSelectionContext.Provider>
      </TileModelContext.Provider>
    )
    return mockAttributeLabelProps.mock.calls.at(-1)[0]
  }

  it("passes the legend menu's change handler to the attribute menu", () => {
    const onChangeAttribute = jest.fn()
    expect(renderLabel(onChangeAttribute).onChangeAttribute).toBe(onChangeAttribute)
  })

  it("removes the legend attribute from its menu and sends V2's attributeChange named as the menu item", () => {
    const onChangeAttribute = jest.fn()
    const { onRemoveAttribute } = renderLabel(onChangeAttribute)
    act(() => onRemoveAttribute("legend", "ATTR7"))
    expect(dataConfiguration.setAttribute).toHaveBeenCalledWith("legend", { attributeID: "" })
    expect(onChangeAttribute).not.toHaveBeenCalled()
    expect(applyModelChange).toHaveBeenCalledTimes(1)
    const { notify } = applyModelChange.mock.calls[0][1]
    expect(notify().message.values).toEqual({
      operation: "attributeChange", attributeId: 7, attributeName: "Remove Legend: Habitat", axisOrientation: "none",
      id: 1, type: "DG.GraphView"
    })
  })
})
