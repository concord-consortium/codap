import { t } from "../utilities/translation/translate"

// implements the necessary properties of SproutCore's SC.Object
export class SCObject {
  // ignore for now
  static extend() {}

  get(prop: string) {
    return (this as any)[prop]
  }

  getPath(path: string) {
    const parts = path.split(".")
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let obj: any = this
    parts.forEach(part => {
      obj = obj?.get(part)
    })
    return obj
  }

  invokeLater(callback: () => void) {
    setTimeout(callback)
  }
}

// provides and exports the required properties of the SC namespace
export const SC = {
  empty(arg: unknown) {
    return arg == null || arg === ""
  },
  none(arg: unknown) {
    return arg == null
  },
  run(callback: () => void) {
    setTimeout(callback)
  },

  Object: SCObject
}

// Given a localizable string key, returns an object whose `.loc()` method returns the translation.
// Used to wrap instances of calling `.loc()` on string constants, which requires modification of
// the built-in string prototype.
export function v2t(strKey: string) {
  return {
    loc(...args: any[]) {
      return t(strKey, { vars: args })
    }
  }
}
