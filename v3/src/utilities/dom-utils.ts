export const scrollTileIntoView = (tileId: string) => {
  // Scroll tile fully into view if necessary
  requestAnimationFrame(() => {
    const el = document.getElementById(tileId)
    if (!el) return

    const rect = el.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const fullyVisible = rect.top >= 0 && rect.left >= 0 && rect.bottom <= vh && rect.right <= vw

    if (!fullyVisible) {
      el.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" })
    }
  })
}
