const { ossLibrariesJson, thirdPartyNoticesMarkdown } = require("./oss-licenses")

const packages = [
  { name: "react", version: "18.3.1", license: "MIT", repository: "https://github.com/facebook/react",
    licenseText: "MIT License\n\nCopyright (c) Meta" },
  { name: "@chakra-ui/react", version: "2.8.2", license: "MIT", licenseText: "MIT License (Chakra)" },
  { name: "d3", version: "7.9.0", license: "ISC", repository: "https://github.com/d3/d3",
    licenseText: "Copyright 2010-2023 Mike Bostock\n```\ncode fence in the text\n```" },
  { name: "some-apache-lib", version: "1.0.0", license: "Apache-2.0", licenseText: "Apache License",
    noticeText: "This product includes software developed by Someone." },
  { name: "no-text", version: "0.1.0" }
]

describe("ossLibrariesJson", () => {
  it("lists name, version, and license, sorted by name, without license text", () => {
    expect(JSON.parse(ossLibrariesJson(packages))).toEqual([
      { name: "@chakra-ui/react", version: "2.8.2", license: "MIT" },
      { name: "d3", version: "7.9.0", license: "ISC" },
      { name: "no-text", version: "0.1.0", license: "Unknown" },
      { name: "react", version: "18.3.1", license: "MIT" },
      { name: "some-apache-lib", version: "1.0.0", license: "Apache-2.0" }
    ])
  })

  it("lists each version of a package separately", () => {
    const libraries = JSON.parse(ossLibrariesJson([
      { name: "tslib", version: "2.6.0", license: "0BSD" },
      { name: "tslib", version: "1.14.1", license: "0BSD" }
    ]))
    expect(libraries.map(library => library.version)).toEqual(["1.14.1", "2.6.0"])
  })
})

describe("thirdPartyNoticesMarkdown", () => {
  const markdown = thirdPartyNoticesMarkdown(packages)

  it("has a section for every package, in name order", () => {
    const headings = markdown.split("\n").filter(line => line.startsWith("## "))
    expect(headings).toEqual([
      "## @chakra-ui/react 2.8.2",
      "## d3 7.9.0",
      "## no-text 0.1.0",
      "## react 18.3.1",
      "## some-apache-lib 1.0.0"
    ])
  })

  it("includes the license, repository, and license text", () => {
    expect(markdown).toContain("- License: MIT")
    expect(markdown).toContain("- Repository: https://github.com/facebook/react")
    expect(markdown).toContain("Copyright (c) Meta")
  })

  it("fences license text so code fences inside it can't break the file", () => {
    expect(markdown).toContain("````\nCopyright 2010-2023 Mike Bostock\n```\ncode fence in the text\n```\n````")
  })

  it("includes NOTICE text", () => {
    expect(markdown).toContain("This product includes software developed by Someone.")
  })

  it("says when a package has no license text", () => {
    expect(markdown).toContain("- License: Unknown")
    expect(markdown).toContain("No license text was found for this package.")
  })

  it("uses the generic license text for MIT and BSD-3-Clause packages without a license file", () => {
    const generic = thirdPartyNoticesMarkdown([
      { name: "mit-lib", version: "1.0.0", license: "MIT" },
      { name: "bsd-lib", version: "1.0.0", license: "BSD-3-Clause" },
      { name: "isc-lib", version: "1.0.0", license: "ISC" }
    ])
    expect(generic).toContain("```\nMIT License\n\nCopyright (c) <year> <copyright holders>\n")
    expect(generic).toContain("```\nCopyright (c) <year> <owner>. \n\nRedistribution and use in source and binary forms")
    expect(generic.split("No license text was found for this package.")).toHaveLength(2)
  })

  it("uses the real license text for packages whose license the plugin can't find", () => {
    const overridden = thirdPartyNoticesMarkdown([
      { name: "@nedb/binary-search-tree", version: "2.1.5", license: "MIT" },
      { name: "rtree", version: "1.4.2", license: "MIT" }
    ])
    expect(overridden).toContain("Copyright (c) 2013 Louis Chatriot <louis.chatriot@gmail.com>")
    expect(overridden).toContain("Copyright (c) 2009 Jon-Carlos Rivera")
    expect(overridden).not.toContain("<copyright holders>")
  })
})
