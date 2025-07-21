import { evaluate } from "../test-utils/formula-test-utils"
import { stringFunctions } from "./string-functions"

describe("stringFunctions", () => {
  describe("beginsWith", () => {
    it("returns true if text begins with prefix", () => {
      expect(stringFunctions.beginsWith.evaluate("Hello World", "Hello")).toBe(true)
    })

    it("returns false if text does not begin with prefix", () => {
      expect(stringFunctions.beginsWith.evaluate("Hello World", "World")).toBe(false)
    })
  })

  describe("charAt", () => {
    it("returns the character at the specified 1-based index in the text", () => {
      expect(stringFunctions.charAt.evaluate("Hello World", 1)).toBe("H")
    })
    it("returns an error if the index is not an integer", () => {
      expect(() => stringFunctions.charAt.evaluate("Hello World", 1.5)).toThrow()
    })
  })

  describe("endsWith", () => {
    it("returns true if text ends with suffix", () => {
      expect(stringFunctions.endsWith.evaluate("Hello World", "World")).toBe(true)
    })

    it("returns false if text does not end with suffix", () => {
      expect(stringFunctions.endsWith.evaluate("Hello World", "Hello")).toBe(false)
    })
  })

  describe("findString", () => {
    it("returns the position of stringToFind in stringToFind starting from start", () => {
      expect(stringFunctions.findString.evaluate("Hello World", "World", 7)).toBe(7)
    })

    it("returns 0 if stringToFind is not found", () => {
      expect(stringFunctions.findString.evaluate("Hello World", "Foo")).toBe(0)
    })
  })

  describe("includes", () => {
    it("returns true if the second argument is a substring of the first", () => {
      expect(stringFunctions.includes.evaluate("Hello World", "World")).toBe(true)
    })

    it("returns false if the second argument is not a substring of the first", () => {
      expect(stringFunctions.includes.evaluate("Hello World", "Foo")).toBe(false)
    })
  })

  describe("combine", () => {
    it("returns the concatenation of text all the values of the attribute", () => {
      expect(stringFunctions.combine.evaluate("Hello World")).toBe("NYI")
    })
  })

  describe("concat", () => {
    it("returns a string that is the concatenation of the string arguments", () => {
      expect(stringFunctions.concat.evaluate("Hello", "World")).toBe("HelloWorld")
    })
  })

  describe("join", () => {
    it("returns a string that is the concatenation of the string arguments separated by a delimiter", () => {
      expect(stringFunctions.join.evaluate("/", 2024, "Hello", "World")).toBe("2024/Hello/World")
    })
  })

  describe("patternMatches", () => {
    it("returns the number of times the text matches the pattern", () => {
      expect(stringFunctions.patternMatches.evaluate("Hello World", "Hello")).toBe(1)
    })

    it("returns 0 if the text does not match the pattern", () => {
      expect(stringFunctions.patternMatches.evaluate("Hello World", "Wxrld")).toBe(0)
    })
  })

  describe("repeatString", () => {
    it("returns the text repeated n times", () => {
      expect(stringFunctions.repeatString.evaluate("Hello", 3)).toBe("HelloHelloHello")
    })
    it("returns an error if the numRepetitions is not an integer", () => {
      expect(() => stringFunctions.repeatString.evaluate("Hello World", 1.5)).toThrow()
    })
  })

  describe("replaceChars", () => {
    it("returns the text with all occurrences of search replaced with replace", () => {
      expect(stringFunctions.replaceChars.evaluate("Hello World", 7, 5, "Universe")).toBe("Hello Universe")
    })
    it("returns the text with returns the text with the substitute inserted if numChars is 0", () => {
      expect(stringFunctions.replaceChars.evaluate("Hello World", 7, 0, "Universe ")).toBe("Hello Universe World")
    })
  })

  describe("replaceString", () => {
    it("returns the text with all occurrences of search replaced with replace", () => {
      expect(stringFunctions.replaceString.evaluate("Hello World", "World", "Universe")).toBe("Hello Universe")
    })
  })

  describe("sortItems", () => {
    it("returns the items in the text sorted", () => {
      expect(stringFunctions.sortItems.evaluate("there, hello, cat")).toBe("cat,hello,there")
    })
    it("with the empty string as delimited it returns the characters sorted", () => {
      expect(stringFunctions.sortItems.evaluate("cba", "")).toBe("abc")
    })
  })

  describe("split", () => {
    it("returns the element at the specified index after splitting the string by the specified separator", () => {
      expect(stringFunctions.split.evaluate("Hello World", " ", 2)).toBe("World")
    })

    it("returns undefined if the index is out of range", () => {
      expect(stringFunctions.split.evaluate("Hello World", " ", 3)).toBeUndefined()
    })
    it("returns an error if the index is not an integer", () => {
      expect(() => stringFunctions.split.evaluate("Hello World", " ", 1.5)).toThrow()
    })
  })

  describe("stringLength", () => {
    it("returns the number of characters in the text", () => {
      expect(stringFunctions.stringLength.evaluate("Hello World")).toBe(11)
    })
  })

  describe("subString", () => {
    it("returns the substring of the text starting from start with length characters", () => {
      expect(stringFunctions.subString.evaluate("Hello World", 7, 5)).toBe("World")
    })
    it("returns an error if the start is not an integer", () => {
      expect(() => stringFunctions.subString.evaluate("Hello World", 7.1, 5)).toThrow()
    })
    it("returns an error if the length is not an integer", () => {
      expect(() => stringFunctions.subString.evaluate("Hello World", 7, 5.1)).toThrow()
    })
  })

  describe("toLower", () => {
    it("returns the text in lower case", () => {
      expect(stringFunctions.toLower.evaluate("Hello World")).toBe("hello world")
    })
  })

  describe("toUpper", () => {
    it("returns the text in upper case", () => {
      expect(stringFunctions.toUpper.evaluate("Hello World")).toBe("HELLO WORLD")
    })
  })

  describe("trim", () => {
    it("returns the text with leading, trailing and >2 spaces whitespace removed", () => {
      expect(stringFunctions.trim.evaluate("  Hello  World  ")).toBe("Hello World")
    })
  })

  describe("wordListMatches", () => {
    it("counts words without ratings", () => {
      // The 0th item in the Sleep attribute is "3".
      // There are 10 copies of "3" in the Age attribute in the Cats dataset.
      expect(evaluate("wordListMatches(Sleep, 'Cats', 'Age')", 0)).toBe(10)
      // This also checks references to dataset and attribute titles rather than names
      expect(evaluate("wordListMatches(Sleep, 'Cats Dataset', 'Age Title')", 2)).toBe(0)
    })

    it("counts words with ratings", () => {
      // The final "3" in Age has a Weight of 11, and all other weights are ignored.
      expect(evaluate("wordListMatches(Sleep, 'Cats', 'Age', 'Weight')", 0)).toBe(110)
      expect(evaluate("wordListMatches(Sleep, 'Cats', 'Age', 'Weight')", 2)).toBe(0)
    })
  })

})
