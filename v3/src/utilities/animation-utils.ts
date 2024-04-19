// A function that takes a duration a "from" object and a "to" object and returns a function that takes a time and 
// returns an object that is the result of interpolating using "ease-in-out" between the "from" and "to" objects 
// based on the time and duration.
export const interpolateEaseInOut = (duration: number, from: Record<string, any>, to: Record<string, any>) => {
  return (time: number) => {
    const t = Math.min(1, time / duration)
    const ease = 0.5 - 0.5 * Math.cos(Math.PI * t)
    const result: Record<string, any> = {}
    for (const key in from) {
      result[key] = from[key] + (to[key] - from[key]) * ease
    }
    return result
  }
}
