/* eslint-disable testing-library/no-node-access */
import { CloudFileManager } from "@concord-consortium/cloud-file-manager"
import { act, render, screen } from "@testing-library/react"
import React from "react"
import { createRoot } from "react-dom/client"

describe("CloudFileManager", () => {

  function createTestCFM() {
    let cfm: CloudFileManager | undefined
    jestSpyConsole("warn", () => {
      cfm = new CloudFileManager()
    })
    return cfm as CloudFileManager
  }

  it("can be created and rendered in a container div", () => {
    const cfm = createTestCFM()
    expect(cfm).toBeDefined()

    render(<div id="container-div" data-testid="container-div"/>)
    const containerDiv = screen.getByTestId("container-div")
    expect(containerDiv).toBeInTheDocument()

    cfm.init({
      appOrMenuElemId: "container-div",
      renderRoot(content: React.ReactNode, container: HTMLElement) {
        const root = createRoot(container)
        root.render(content)
      }
    })
    // eslint-disable-next-line testing-library/no-unnecessary-act
    act(() => {
      cfm._renderApp(containerDiv)
    })
    expect(containerDiv.querySelector(".view")).toBeInTheDocument()
  })
})
/* eslint-enable testing-library/no-node-access */
