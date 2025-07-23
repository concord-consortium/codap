export const unescapeBacktickString = (name: string) =>
  name.replace(/\\`/g, "`").replace(/\\\\/g, "\\")

export const escapeBacktickString = (name: string) =>
  name.replace(/\\/g, "\\\\").replace(/`/g, "\\`")

export const escapeDoubleQuoteString = (constant: string) =>
  constant.replace(/\\/g, "\\\\").replace(/"/g, '\\"')

export const escapeSingleQuoteString = (constant: string) =>
  constant.replace(/\\/g, "\\\\").replace(/'/g, "\\'")
