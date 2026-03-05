
import { useEffect, useRef, useState } from "react"
import { t } from "../../utilities/translation/translate"
import "@concord-consortium/cloud-file-manager/dist/css/app.css"
import "./menu-bar.scss"

export const kMenuBarElementId = "codap-menu-bar-id"

export function MenuBar() {
  const [hasChildren, setHasChildren] = useState(false)
  const menuBarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = menuBarRef.current
    if (!el) return
    if (el.children.length > 0) setHasChildren(true)

    const observer = new MutationObserver(() => {
      setHasChildren(el.children.length > 0)
    })
    observer.observe(el, { childList: true })

    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={menuBarRef}
      id={kMenuBarElementId}
      className="codap-menu-bar"
      data-testid="codap-menu-bar"
      aria-label={t("V3.app.menuBar.ariaLabel")}
      role={hasChildren ? "menubar" : undefined}
    >
    </div>
  )
}
