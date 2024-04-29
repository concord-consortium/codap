import { render, screen } from "@testing-library/react"
import React from "react"
import { DG } from "../../v2/dg-compat.v2"
import "./collection-header.v2"
const { CollectionHeader } = DG.React.Components as any

describe("Case card CollectionHeader", () => {
  it("renders", () => {
    const caseCount = 10
    const collectionName = "Mammals"
    const collectionClient = {
      get(propName: string) {
        if (propName === "collection") {
          return {
            get(_propName: string) {
              switch (_propName) {
                case "name": return collectionName
                // client only cares about its length
                case "cases": return new Array(caseCount)
              }
            }
          }
        }
      },
      getPath(path: string) {
        if (path === "casesController.selection") {
          return {
            toArray() {
              // client only cares about its length
              // selection is mocked to be empty by default
              return []
            }
          }
        }
      }
    }
    const mockOnCollectionNameChange = jest.fn()
    const mockOnHeaderWidthChange = jest.fn()

    render(
      <table>
        <tbody>
          <CollectionHeader
            index={undefined}
            collClient={collectionClient}
            caseID={undefined}
            columnWidthPct={0.5}
            onCollectionNameChange={mockOnCollectionNameChange}
            onHeaderWidthChange={mockOnHeaderWidthChange}
            dragStatus={undefined}
            />
        </tbody>
      </table>
    )
    const collectionLabel = screen.getByText(`${caseCount} ${collectionName}`)
    expect(collectionLabel).toBeInTheDocument()
  })
})
