import { useEffect } from "react"

export const useChakraPatches = () => {
  // Chakra UI v2 pre-renders hidden portal divs for components like Menu, Tooltip, and Popover.
  // These clutter the accessibility tree for screen readers even when not visible. We observe
  // mutations and set aria-hidden on portals whose content is hidden, removing it when visible.
  // This workaround can be removed when upgrading to Chakra UI v3, which fixes the issue natively,
  // or another framework. See: https://github.com/chakra-ui/chakra-ui/issues/8620
  useEffect(() => {
    const isPortalHidden = (portal: Element) => {
      if (portal.children.length === 0) return true
      const firstChild = portal.children[0] as HTMLElement
      return firstChild?.style?.visibility === "hidden"
    }

    const updatePortalVisibility = (portal: Element) => {
      if (isPortalHidden(portal)) {
        portal.setAttribute("aria-hidden", "true")
      } else {
        portal.removeAttribute("aria-hidden")
      }
    }

    const portalObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        const portal = mutation.target instanceof Element
          ? mutation.target.closest(".chakra-portal")
          : mutation.target.parentElement?.closest(".chakra-portal")
        if (portal) {
          updatePortalVisibility(portal)
        }
      }
    })

    document.querySelectorAll(".chakra-portal").forEach(updatePortalVisibility)

    portalObserver.observe(document.body, {
      childList: true, subtree: true, attributes: true, attributeFilter: ["style"]
    })

    return () => portalObserver.disconnect()
  }, [])
}
