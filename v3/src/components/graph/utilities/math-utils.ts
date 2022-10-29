

export function between(num:number, min:number, max:number) {
  return min < max ? (min <= num && num <= max) : (max <= num && num <= min)
}


