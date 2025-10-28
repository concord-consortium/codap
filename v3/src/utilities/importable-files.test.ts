import {
  getExtensionFromFile,
  getImportableFileTypeFromFile,
  getImportableFileTypeFromUrl,
  getImportableFileTypeFromDataTransferFile,
} from './importable-files'

describe('getExtensionFromFile', () => {

  it('should return the extension for a file with a single extension', () => {
    const file = { name: 'document.txt' } as File
    expect(getExtensionFromFile(file)).toBe('txt')
  })

  it('should return the extension for a file with multiple dots', () => {
    const file = { name: 'archive.tar.gz' } as File
    expect(getExtensionFromFile(file)).toBe('gz')
  })

  it('should return undefined for a file with no extension', () => {
    const file = { name: 'README' } as File
    expect(getExtensionFromFile(file)).toBeUndefined()
  })

  it('should return undefined for null file', () => {
    expect(getExtensionFromFile(null)).toBeUndefined()
  })

  it('should handle uppercase extensions and return them in lowercase', () => {
    const file = { name: 'photo.JPG' } as File
    expect(getExtensionFromFile(file)).toBe('jpg')
  })

  it('should return undefined for a file with name starting with a dot and no extension', () => {
    const file = { name: '.gitignore' } as File
    expect(getExtensionFromFile(file)).toBeUndefined()
  })

  it('should return the extension for a file with name starting with a dot and an extension', () => {
    const file = { name: '.env.local' } as File
    expect(getExtensionFromFile(file)).toBe('local')
  })
})

describe('getImportableFileTypeFromFile', () => {
  it('should return correct type for csv file', () => {
    const file = { name: 'data.csv' } as File
    expect(getImportableFileTypeFromFile(file)).toBe('csv')
  })

  it('should return correct type for image file', () => {
    const file = { name: 'picture.png' } as File
    expect(getImportableFileTypeFromFile(file)).toBe('image')
  })

  it('should return undefined for unknown extension', () => {
    const file = { name: 'file.unknown' } as File
    expect(getImportableFileTypeFromFile(file)).toBeUndefined()
  })

  it('should return undefined for null file', () => {
    expect(getImportableFileTypeFromFile(null)).toBeUndefined()
  })
})

describe('getImportableFileTypeFromUrl', () => {
  it('should return correct type for geojson url', () => {
    expect(getImportableFileTypeFromUrl('https://example.com/map.geojson')).toBe('geojson')
  })

  it('should return correct type for html url', () => {
    expect(getImportableFileTypeFromUrl('https://example.com/index.html')).toBe('html')
  })

  it('should return undefined for url with no extension', () => {
    expect(getImportableFileTypeFromUrl('https://example.com/file')).toBeUndefined()
  })

  it('should return correct type for uppercase extension', () => {
    expect(getImportableFileTypeFromUrl('https://example.com/image.JPG')).toBe('image')
  })
})

describe('getImportableFileTypeFromDataTransferFile', () => {
  function makeDataTransferItem({ kind, type, name }: { kind: string, type: string, name?: string }) {
    return {
      kind,
      type,
      getAsFile: () => name ? ({ name } as File) : null
    } as DataTransferItem
  }

  it('should return correct type based on content type', () => {
    const item = makeDataTransferItem({ kind: 'file', type: 'image/png', name: 'irrelevant.txt' })
    expect(getImportableFileTypeFromDataTransferFile(item)).toBe('image')
  })

  it('should fallback to extension if content type does not match', () => {
    const item = makeDataTransferItem({ kind: 'file', type: 'application/octet-stream', name: 'data.csv' })
    expect(getImportableFileTypeFromDataTransferFile(item)).toBe('csv')
  })

  it('should return undefined if neither content type nor extension matches', () => {
    const item = makeDataTransferItem({ kind: 'file', type: 'application/octet-stream', name: 'file.unknown' })
    expect(getImportableFileTypeFromDataTransferFile(item)).toBeUndefined()
  })

  it('should return undefined if item is not a file', () => {
    const item = makeDataTransferItem({ kind: 'string', type: '', name: undefined })
    expect(getImportableFileTypeFromDataTransferFile(item)).toBeUndefined()
  })
})
