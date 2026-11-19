import { render } from "@testing-library/react"
import { DataConfigurationContext } from "../../hooks/use-data-configuration-context"
import { Legend } from "./legend"

// capture the handler the legend passes to its attribute label (and through it to the attribute menu)
const mockLabelProps = jest.fn()
jest.mock("./legend-attribute-label", () => ({
  LegendAttributeLabel: (props: any) => {
    mockLabelProps(props)
    return null
  }
}))
jest.mock("./categorical-legend", () => ({ CategoricalLegend: () => null }))

describe("Legend", () => {
  it("gives the attribute label the menu's change handler, not the drop handler", () => {
    const dataConfiguration = {
      attributeID: () => "ATTR7",
      attributeType: () => "categorical",
      legendAttributeIsInoperable: false,
      isAttributeAllowedForNonAxisRole: () => true
    } as any
    const onDropAttribute = jest.fn()
    const onChangeAttribute = jest.fn()
    render(
      <DataConfigurationContext.Provider value={dataConfiguration}>
        <Legend layerIndex={0} setDesiredExtent={jest.fn()}
                onDropAttribute={onDropAttribute} onChangeAttribute={onChangeAttribute} />
      </DataConfigurationContext.Provider>
    )
    expect(mockLabelProps).toHaveBeenCalled()
    expect(mockLabelProps.mock.calls.at(-1)[0].onChangeAttribute).toBe(onChangeAttribute)
  })
})
