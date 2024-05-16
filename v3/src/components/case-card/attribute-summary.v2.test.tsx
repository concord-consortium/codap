import { render, screen } from "@testing-library/react"
import React from "react"
import { DataSet } from "../../models/data/data-set"
import { DG } from "../../v2/dg-compat.v2"
import { DGDataContext } from "../../models/v2/dg-data-context"
import "./attribute-summary.v2"
const { AttributeSummary } = DG.React.Components as any

describe("Case card AttributeSummary", () => {
  it("summarizes numeric values", async () => {
    const data = DataSet.create({ name: "Context" })
    data.addAttribute({ id: "AttrID" })
    data.addCases([{ __id__: "Case1", AttrID: 0 }, { __id__: "Case2", AttrID: 10 }])
    const context = new DGDataContext(data)

    render(
      <AttributeSummary attr={context.getAttribute("AttrID")} cases={context.getCases()}/>
    )
    const valueElt = screen.getByText("0–10", { exact: false })
    expect(valueElt).toBeInTheDocument()
  })

  it("summarizes numeric values with a numeric attribute type", async () => {
    const data = DataSet.create({ name: "Context" })
    data.addAttribute({ id: "AttrID", userType: "numeric" })
    data.addCases([{ __id__: "Case1", AttrID: 0 }, { __id__: "Case2", AttrID: 10 }])
    const context = new DGDataContext(data)

    render(
      <AttributeSummary attr={context.getAttribute("AttrID")} cases={context.getCases()}/>
    )
    const valueElt = screen.getByText("0–10", { exact: false })
    expect(valueElt).toBeInTheDocument()
  })

  it("summarizes string values", async () => {
    const data = DataSet.create({ name: "Context" })
    data.addAttribute({ id: "AttrID" })
    data.addCases([{ __id__: "Case1", AttrID: "foo" }, { __id__: "Case2", AttrID: "bar" }])
    const context = new DGDataContext(data)

    // renders the value by default
    render(
      <AttributeSummary attr={context.getAttribute("AttrID")} cases={context.getCases()}/>
    )
    const valueElt = screen.getByText("foo, bar")
    expect(valueElt).toBeInTheDocument()
  })
})
