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

      if (firstChild?.style?.visibility === "hidden") return true

      // Toast manager portal: Chakra UI v2 pre-renders this even though CODAP doesn't
      // use toasts. Treat it as hidden when all toast regions are empty.
      if (firstChild?.id?.startsWith("chakra-toast-manager-")) {
        return Array.from(portal.children).every(child => child.children.length === 0)
      }

      return false
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
        // Handle any mutation within existing portals (style changes, content added/removed, etc.)
        const portal = mutation.target instanceof Element
          ? mutation.target.closest(".chakra-portal")
          : mutation.target.parentElement?.closest(".chakra-portal")
        if (portal) {
          updatePortalVisibility(portal)
        }

        // Handle newly added portals
        if (mutation.type !== "childList") continue
        for (const node of mutation.addedNodes) {
          if (node instanceof Element) {
            if (node.classList.contains("chakra-portal")) {
              updatePortalVisibility(node)
            }
            node.querySelectorAll(".chakra-portal").forEach(updatePortalVisibility)
          }
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
