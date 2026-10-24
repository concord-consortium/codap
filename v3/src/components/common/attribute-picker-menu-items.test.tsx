import { Menu, MenuButton, MenuList } from "@chakra-ui/react"
import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { createRef } from "react"
import { IDataSet } from "../../models/data/data-set"
import { setupTestDataset } from "../../test/dataset-test-utils"
import {
  AttributePickerEntry, AttributePickerMenuItems, getAttributePickerEntries, useAttributePickerSubmenus
} from "./attribute-picker-menu-items"

jest.mock("../../hooks/use-menu-height-adjustment", () => ({
  useMenuHeightAdjustment: () => undefined
}))

interface IHarnessProps {
  entries: AttributePickerEntry[]
  isAttributeAllowed?: (dataSet: IDataSet, attrId: string) => boolean
  onSelect?: (dataSet: IDataSet, attrId: string) => void
}
function Harness({ entries, isAttributeAllowed, onSelect = jest.fn() }: IHarnessProps) {
  const submenus = useAttributePickerSubmenus()
  const containerRef = createRef<HTMLDivElement>()
  return (
    <Menu isOpen={true}>
      <MenuButton>open</MenuButton>
      <MenuList>
        <AttributePickerMenuItems entries={entries} isAttributeAllowed={isAttributeAllowed} onSelect={onSelect}
          submenus={submenus} containerRef={containerRef} maxMenuHeight="300px"/>
      </MenuList>
    </Menu>
  )
}

describe("getAttributePickerEntries", () => {
  it("lists each collection with its dataset, with a divider between datasets", () => {
    const { dataset: ds1 } = setupTestDataset({ datasetName: "one" })
    const { dataset: ds2 } = setupTestDataset({ datasetName: "two" })
    const entries = getAttributePickerEntries([ds1, ds2], () => undefined)
    const summary = entries.map(entry => entry === "divider" ? "|" : `${entry.data.name}:${entry.collection.name}`)
    expect(summary).toEqual([
      "one:collection1", "one:collection2", "one:collection3", "|",
      "two:collection1", "two:collection2", "two:collection3"
    ])
  })
})

describe("AttributePickerMenuItems", () => {
  it("lists a single collection's attributes directly", async () => {
    const { dataset } = setupTestDataset()
    const [, , c3] = dataset.collections
    const onSelect = jest.fn()
    render(<Harness entries={[{ collection: c3, data: dataset }]} onSelect={onSelect}/>)
    expect(screen.getAllByRole("menuitem").map(item => item.textContent)).toEqual(["a3", "a4"])
    await userEvent.click(screen.getByRole("menuitem", { name: "a4" }))
    expect(onSelect).toHaveBeenCalledWith(dataset, dataset.attrFromName("a4")!.id)
  })

  it("puts each collection's attributes in a submenu when there are several", async () => {
    const { dataset } = setupTestDataset()
    const onSelect = jest.fn()
    render(<Harness entries={getAttributePickerEntries([dataset], () => undefined)} onSelect={onSelect}/>)
    const collectionItems = screen.getAllByRole("menuitem")
    expect(collectionItems.map(item => item.textContent)).toEqual(["collection1", "collection2", "collection3"])
    expect(collectionItems[2]).toHaveAttribute("aria-haspopup", "menu")
    await userEvent.click(collectionItems[2])
    await userEvent.click(await screen.findByRole("menuitem", { name: "a3" }))
    expect(onSelect).toHaveBeenCalledWith(dataset, dataset.attrFromName("a3")!.id)
  })

  it("separates datasets with a divider", () => {
    const { dataset: ds1 } = setupTestDataset({ datasetName: "one" })
    const { dataset: ds2 } = setupTestDataset({ datasetName: "two" })
    render(<Harness entries={getAttributePickerEntries([ds1, ds2], () => undefined)}/>)
    expect(screen.getAllByRole("separator")).toHaveLength(1)
  })

  it("leaves out hidden attributes", () => {
    const { dataset, metadata } = setupTestDataset()
    const [, , c3] = dataset.collections
    metadata.setIsHidden(dataset.attrFromName("a3")!.id, true)
    render(<Harness entries={[{ collection: c3, data: dataset, metadata }]}/>)
    expect(screen.getAllByRole("menuitem").map(item => item.textContent)).toEqual(["a4"])
  })

  it("offers only the attributes the filter allows", () => {
    const { dataset } = setupTestDataset()
    const [, , c3] = dataset.collections
    const a4 = dataset.attrFromName("a4")!
    render(<Harness entries={[{ collection: c3, data: dataset }]}
                    isAttributeAllowed={(_data, attrId) => attrId === a4.id}/>)
    expect(screen.getAllByRole("menuitem").map(item => item.textContent)).toEqual(["a4"])
  })

  it("leaves out collections, and the dividers of datasets, with nothing to offer", () => {
    const { dataset: ds1 } = setupTestDataset({ datasetName: "one" })
    const { dataset: ds2 } = setupTestDataset({ datasetName: "two" })
    const allowed = [ds1.attrFromName("a1")!.id, ds1.attrFromName("a3")!.id]
    render(<Harness entries={getAttributePickerEntries([ds1, ds2], () => undefined)}
                    isAttributeAllowed={(_data, attrId) => allowed.includes(attrId)}/>)
    expect(screen.getAllByRole("menuitem").map(item => item.textContent)).toEqual(["collection1", "collection3"])
    expect(screen.queryByRole("separator")).toBeNull()
  })

  it("lists the attributes directly when only one collection has any to offer", () => {
    const { dataset } = setupTestDataset()
    const a4 = dataset.attrFromName("a4")!
    render(<Harness entries={getAttributePickerEntries([dataset], () => undefined)}
                    isAttributeAllowed={(_data, attrId) => attrId === a4.id}/>)
    expect(screen.getAllByRole("menuitem").map(item => item.textContent)).toEqual(["a4"])
  })

  it("says so when no attribute is available", () => {
    const { dataset } = setupTestDataset()
    render(<Harness entries={getAttributePickerEntries([dataset], () => undefined)}
                    isAttributeAllowed={() => false}/>)
    const item = screen.getByRole("menuitem", { name: "No attributes available" })
    expect(item).toHaveAttribute("aria-disabled", "true")
  })
})
