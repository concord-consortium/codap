export function getExtensionFromUrl(url: string): string | undefined {
  try {
    const pathParts = new URL(url).pathname.toLowerCase().split(".")
    return pathParts.length > 1 ? pathParts[pathParts.length - 1] : undefined
  } catch (error) {
    return undefined
  }
}
