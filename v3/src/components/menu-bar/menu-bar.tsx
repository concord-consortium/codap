import { Menu, MenuButton, MenuItem, MenuList } from "@chakra-ui/react"
import React from "react"
import build from "../../../build_number.json"
import pkg from "../../../package.json"
import { getCurrentDocument } from "../../models/codap/create-codap-document"
import { gDataBroker } from "../../models/data/data-broker"
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
          <MenuItem isDisabled={true}>Import JSON File...</MenuItem>
          <MenuItem onClick={exportDocument}>Export JSON File...</MenuItem>
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

function exportDocument() {
  // Convert JSON to string
  gDataBroker.prepareSnapshots()
  const data = JSON.stringify(getCurrentDocument())
  gDataBroker.completeSnapshots()

  // Create a Blob object
  const blob = new Blob([data], { type: 'application/json' })

  // Create an object URL
  const url = URL.createObjectURL(blob)

  // Download file
  download(url, "untitled.codap3")

  // Release the object URL
  URL.revokeObjectURL(url)
}
