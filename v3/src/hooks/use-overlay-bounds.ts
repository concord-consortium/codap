interface IProps {
  target: Element | null
  portal?: Element | null
}

export function useOverlayBounds({ target, portal }: IProps) {
  const portalBounds = portal?.getBoundingClientRect()
  const targetBounds = target?.getBoundingClientRect()
  if (targetBounds) {
    return {
      left: targetBounds.x - (portalBounds?.x ?? 0),
      top: targetBounds.y - (portalBounds?.y ?? 0),
      width: targetBounds.width,
      height: targetBounds.height
    }
  } else {
    return {}
  }
}
