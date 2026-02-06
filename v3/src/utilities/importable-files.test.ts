import {
  getExtensionFromFile,
  getImportableFileTypeFromFile,
  getImportableFileTypeFromUrl,
  getImportableFileTypeFromDataTransferFile,
  isGoogleSheetsUrl,
  stripExtensionFromFilename,
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

describe('isGoogleSheetsUrl', () => {
  it('should return true for standard Google Sheets URL', () => {
    expect(isGoogleSheetsUrl('https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit')).toBe(true)
  })

  it('should return true for Google Sheets URL with gid parameter', () => {
    expect(isGoogleSheetsUrl('https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0')).toBe(true)
  })

  it('should return true for Google Sheets URL with query parameters', () => {
    expect(isGoogleSheetsUrl('https://docs.google.com/spreadsheets/d/1abc123/edit?usp=sharing')).toBe(true)
  })

  it('should return false for non-Google Sheets URL', () => {
    expect(isGoogleSheetsUrl('https://example.com/data.csv')).toBe(false)
  })

  it('should return false for Google Docs URL (not Sheets)', () => {
    expect(isGoogleSheetsUrl('https://docs.google.com/document/d/1abc123/edit')).toBe(false)
  })

  it('should return false for Google Slides URL', () => {
    expect(isGoogleSheetsUrl('https://docs.google.com/presentation/d/1abc123/edit')).toBe(false)
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

  it('should return google-sheets for Google Sheets URL', () => {
    expect(getImportableFileTypeFromUrl('https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit')).toBe('google-sheets')
  })

  it('should return google-sheets for Google Sheets URL regardless of case', () => {
    expect(getImportableFileTypeFromUrl('https://DOCS.GOOGLE.COM/Spreadsheets/d/1abc/edit')).toBe('google-sheets')
  })

  it('should return image for data:image/png URL', () => {
    expect(getImportableFileTypeFromUrl('data:image/png;base64,iVBORw0KGgoAAAANS...')).toBe('image')
  })

  it('should return image for data:image/jpeg URL', () => {
    expect(getImportableFileTypeFromUrl('data:image/jpeg;base64,/9j/4AAQ...')).toBe('image')
  })

  it('should return image for data:image/gif URL', () => {
    expect(getImportableFileTypeFromUrl('data:image/gif;base64,R0lGODlh...')).toBe('image')
  })

  it('should not return image for non-image data URLs', () => {
    expect(getImportableFileTypeFromUrl('data:text/html;base64,PGh0bWw+...')).toBeUndefined()
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

describe('stripExtensionFromFilename', () => {
  it('removes single file extension', () => {
    expect(stripExtensionFromFilename('image.jpg')).toBe('image')
    expect(stripExtensionFromFilename('photo.png')).toBe('photo')
    expect(stripExtensionFromFilename('diagram.gif')).toBe('diagram')
  })

  it('preserves hyphens in filenames', () => {
    expect(stripExtensionFromFilename('atlantic-cod.jpg')).toBe('atlantic-cod')
    expect(stripExtensionFromFilename('my-vacation-photo.png')).toBe('my-vacation-photo')
  })

  it('preserves underscores and other valid filename characters', () => {
    expect(stripExtensionFromFilename('image_v2.jpg')).toBe('image_v2')
    expect(stripExtensionFromFilename('my-image_v2.1.png')).toBe('my-image_v2.1')
  })

  it('removes only the final extension when multiple dots are present', () => {
    expect(stripExtensionFromFilename('archive.tar.gz')).toBe('archive.tar')
    expect(stripExtensionFromFilename('image.backup.jpg')).toBe('image.backup')
  })

  it('handles filenames with no extension', () => {
    expect(stripExtensionFromFilename('image')).toBe('image')
    expect(stripExtensionFromFilename('photo-collection')).toBe('photo-collection')
  })

  it('handles filenames starting with a dot', () => {
    expect(stripExtensionFromFilename('.gitignore')).toBe('.gitignore')
    expect(stripExtensionFromFilename('.hidden.jpg')).toBe('.hidden')
  })

  it('works with uppercase extensions', () => {
    expect(stripExtensionFromFilename('PHOTO.JPG')).toBe('PHOTO')
    expect(stripExtensionFromFilename('Image.PNG')).toBe('Image')
  })
})
