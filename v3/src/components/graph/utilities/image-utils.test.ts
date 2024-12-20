import { base64ToBlob, downloadGraphSnapshot } from "./image-utils"

const dataUri = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg=="

describe("base64ToBlob", () => {
  it("should convert a base64 string to a blob", () => {
    const blob = base64ToBlob(dataUri)

    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(0)
    expect(blob.type).toBe("image/png")
  })
})

describe("downloadGraphSnapshot", () => {
  global.URL.createObjectURL = jest.fn();
  it("should download a graph snapshot", async () => {
    const downloadLinkSpy = jest.spyOn(document, "createElement").mockReturnValueOnce({
      click: jest.fn(),
      href: dataUri,
      download: "graph.png",
      style: {}
    } as any)

    downloadGraphSnapshot(dataUri, "graph.png")
    expect(downloadLinkSpy).toBeCalledWith("a")
  })
})
