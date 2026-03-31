
import { useRef } from "react"
import { useRegisterSection } from "../../hooks/use-section-navigation"

import "@concord-consortium/cloud-file-manager/dist/css/app.css"
import "./menu-bar.scss"

export const kMenuBarElementId = "codap-menu-bar-id"

export function MenuBar() {
  const menuBarRef = useRef<HTMLDivElement>(null)
  useRegisterSection("menubar", menuBarRef, 0)

  return (
    <div id={kMenuBarElementId} className="codap-menu-bar" data-testid="codap-menu-bar"
      ref={menuBarRef}>
    </div>
  )
}
