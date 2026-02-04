
import "@concord-consortium/cloud-file-manager/dist/css/app.css"
import "./menu-bar.scss"

export const kMenuBarElementId = "codap-menu-bar-id"

export function MenuBar() {
  return (
    <div id={kMenuBarElementId} className="codap-menu-bar" data-testid="codap-menu-bar">
    </div>
  )
}
