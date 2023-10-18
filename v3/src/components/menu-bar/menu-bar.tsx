import { Menu, MenuButton, MenuItem, MenuList } from "@chakra-ui/react"
import React from "react"
import build from "../../../build_number.json"
import pkg from "../../../package.json"
import { appState } from "../../models/app-state"
import { serializeDocument } from "../../models/document/serialize-document"
import { HamburgerIcon } from "./hamburger-icon"

import "./menu-bar.scss"

export function MenuBar() {
  return (
    <div className="menu-bar">
      <Menu>
        <MenuButton className="hamburger-button">
          <HamburgerIcon/>
        </MenuButton>
        <div className="version-build-number">
          <span>v{pkg.version}-build-{build.buildNumber}</span>
        </div>
        <MenuList>
          <MenuItem onClick={handleImportDocument}>Import JSON File...</MenuItem>
          <MenuItem onClick={handleExportDocument}>Export JSON File...</MenuItem>
        </MenuList>
      </Menu>
    </div>
  )
}

// https://attacomsian.com/blog/javascript-download-file
function download(path: string, filename: string) {
  // Create a new link
  const anchor = document.createElement('a')
  anchor.href = path
  anchor.download = filename

  // Append to the DOM
  document.body.appendChild(anchor)

  // Trigger `click` event
  anchor.click()

  // Remove element from DOM
  document.body.removeChild(anchor)
}

function handleExportDocument() {
  // Convert JSON to string
  const data = serializeDocument(appState.document, () => JSON.stringify(appState.document))

  // Create a Blob object
  const blob = new Blob([data], { type: 'application/json' })

  // Create an object URL
  const url = URL.createObjectURL(blob)

  // Download file
  download(url, "untitled.codap3")

  // Release the object URL
  URL.revokeObjectURL(url)
}

function handleImportDocument() {
  // create a new input element
  const input = document.createElement("input")
  input.type = "file"
  input.addEventListener('change', function handleChange() {
    // check if user had selected a file
    if (!input.files?.length) return

    const file = input.files[0]
    const reader = new FileReader()

    reader.onload = function() {
      const json = reader.result as string | null
      const snap = json && JSON.parse(json)
      try {
        if (snap) {
          appState.setDocument(snap)
        }
      }
      catch (e) {
        console.error("error opening document!")
      }
    }

    reader.onerror = function() {
      console.error(reader.error)
    }

    reader.readAsText(file)
  })

  // append to the DOM
  document.body.appendChild(input)

  // trigger `click` event
  input.click()

  // Remove element from DOM
  document.body.removeChild(input)
}
