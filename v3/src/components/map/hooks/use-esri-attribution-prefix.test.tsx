import { render } from "@testing-library/react"
import { Map as LeafletMap } from "leaflet"
import { MapContainer } from "react-leaflet"
import { useEsriAttributionPrefix } from "./use-esri-attribution-prefix"

// The hook needs react-leaflet's MapContainer context, and the unmount test needs to unmount the hook while the map
// stays mounted, so the hook is exercised through a minimal component rendered inside a MapContainer.
function EsriAttributionPrefix({ show }: { show: boolean }) {
  useEsriAttributionPrefix(show)
  return null
}

describe("useEsriAttributionPrefix", () => {
  function renderPrefix(props: { mounted?: boolean, show: boolean }) {
    const { mounted = true, show } = props
    let leafletMap: LeafletMap | null = null
    const ui = (mountedNow: boolean, showNow: boolean) => (
      <MapContainer ref={instance => { if (instance) leafletMap = instance }} center={[0, 0]} zoom={1}>
        {mountedNow && <EsriAttributionPrefix show={showNow}/>}
      </MapContainer>
    )
    const view = render(ui(mounted, show))
    const map = () => leafletMap as unknown as LeafletMap
    const container = () => map().attributionControl.getContainer() as HTMLElement
    const rerender = (mountedNow: boolean, showNow: boolean) => view.rerender(ui(mountedNow, showNow))
    return { map, container, rerender }
  }

  it("adds 'Powered by Esri' after Leaflet's default prefix when shown", () => {
    const { container } = renderPrefix({ show: true })
    expect(container().textContent).toMatch(/Leaflet\s*\|\s*Powered by Esri/)
    // eslint-disable-next-line testing-library/no-node-access -- inspecting Leaflet's attribution control DOM
    expect(container().querySelector('a[href="https://www.esri.com"]')).not.toBeNull()
  })

  it("does not add 'Powered by Esri' when not shown", () => {
    const { container } = renderPrefix({ show: false })
    expect(container().textContent).toContain("Leaflet")
    expect(container().textContent).not.toContain("Powered by Esri")
  })

  it("removes 'Powered by Esri' when show becomes false and restores it when true again", () => {
    const { container, rerender } = renderPrefix({ show: true })
    rerender(true, false)
    expect(container().textContent).not.toContain("Powered by Esri")
    rerender(true, true)
    expect(container().textContent).toMatch(/Leaflet\s*\|\s*Powered by Esri/)
    // never duplicated
    expect(container().textContent?.match(/Powered by Esri/g)).toHaveLength(1)
  })

  it("restores the default prefix when unmounted", () => {
    const { container, rerender } = renderPrefix({ show: true })
    rerender(false, true)
    expect(container().textContent).toContain("Leaflet")
    expect(container().textContent).not.toContain("Powered by Esri")
  })

  it("makes the attribution control keyboard-focusable", () => {
    const { container } = renderPrefix({ show: true })
    expect(container().getAttribute("tabindex")).toBe("0")
  })
})
