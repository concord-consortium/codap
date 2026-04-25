export function scrollTargetIntoView(el: HTMLElement, smooth: boolean) {
  el.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "nearest", inline: "nearest" })
}
