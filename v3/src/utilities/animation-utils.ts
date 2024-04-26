export const kDefaultAnimationDuration = 500
export interface ComponentRect {
  x: number
  y: number
  width: number
  height: number
  [key: string]: number
}
export const interpolateEaseInOut = (duration: number, from: ComponentRect, to: ComponentRect) => {
  return (time: number) => {
    const t = Math.min(1, time / duration)
    const ease = 0.5 - 0.5 * Math.cos(Math.PI * t)
    const result: ComponentRect = {x: 0, y: 0, width: 0, height: 0}
    for (const key in from) {
      result[key] = from[key] + (to[key] - from[key]) * ease
    }
    return result
  }
}

// This function takes a duration, a <from> object, a <to> object and a callback function. It calls
// interpolateEaseInOut repeatedly and calls the callback with the result each time through the loop.
// The loop runs until the elapsed time is greater than the duration.
// Todo: Instead of being tied to ComponentRect, make it Record<string,number>
export const animateEaseInOut = (duration: number, from: ComponentRect, to: ComponentRect,
                                 callback: (result: ComponentRect) => void) => {
  const interpolate = interpolateEaseInOut(duration, from, to)
  const startTime = Date.now()
  const step = () => {
    const time = Date.now() - startTime
    if (time < duration) {
      callback(interpolate(time))
      requestAnimationFrame(step)
    } else {
      callback(to)
    }
  }
  requestAnimationFrame(step)
}
