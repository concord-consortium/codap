/*
 * comma(condition: boolean)
 *
 * utility function for building JSON strings; returns "," or "" depending on its argument
 */
export const comma = (condition: boolean) => condition ? "," : ""

export const spaces = (count: number) => {
  let s = ""
  for (; s.length < count; s += " ");
  return s
}

export class StringBuilder {
  private lines: string[] = []

  public pushLine(line: string, indent = 0) {
    this.lines.push(spaces(indent) + line)
  }

  public pushLines(lines: string[], indent = 0) {
    const spc = spaces(indent)
    for (let i = 0; i < lines.length; ++i) {
      lines[i] = spc + lines[i]
    }
    this.lines.push(...lines)
  }

  public pushBlock(block: string, indent = 0) {
    // strip trailing newline for insertion purposes
    const _block = block?.[block.length - 1] === "\n"
                    ? block.slice(0, block.length - 1)
                    : block
    this.pushLines(_block.split("\n"), indent)
  }

  public build() {
    const result = this.lines.join("\n")
    return result + (result ? "\n" : "")
  }
}
