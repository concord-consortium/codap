# GeoTIFF Implementation Design

## Overview

This document outlines the implementation of GeoTIFF support in the CODAP v3 map component. The feature will allow plugins to programmatically display GeoTIFF files from URLs on the Leaflet map, with proper handling of URL changes and cleanup.

## Current State

The map component currently has:
1. A `geotiffUrl` property in the `MapContentModel`
2. A `setGeotiffUrl` action to update the URL
3. Basic Leaflet map integration
4. Support for point and polygon layers

## Requirements

1. When `geotiffUrl` is non-empty:
   - Download the GeoTIFF file from the URL
   - Display it as a layer on the Leaflet map
   - Fail silently if there are any errors

2. When `geotiffUrl` changes:
   - Remove the old GeoTIFF layer if it exists
   - Download and display the new GeoTIFF
   - Maintain proper cleanup

3. When the component unmounts:
   - Remove the GeoTIFF layer
   - Clean up any resources

## Technical Design

### 1. Dependencies

We'll need to add:
- `geotiff.js` for parsing GeoTIFF files
- `leaflet-geotiff` for displaying GeoTIFF on Leaflet maps

### 2. Model Changes

The `MapContentModel` already has the necessary properties:
```typescript
geotiffUrl: types.optional(types.string, ""),
```

### 3. Component Changes

We'll need to:
1. Add a new volatile property to track the GeoTIFF layer:
```typescript
geotiffLayer: undefined as L.Layer | undefined,
```

2. Create a new action to manage the GeoTIFF layer:
```typescript
updateGeotiffLayer() {
  // Remove existing layer
  if (self.geotiffLayer) {
    self.leafletMap?.removeLayer(self.geotiffLayer)
    self.geotiffLayer = undefined
  }

  // Add new layer if URL exists
  if (self.geotiffUrl) {
    try {
      // Implementation here
      // Fail silently if there are any errors
    } catch (error) {
      console.error('Failed to load GeoTIFF:', error)
    }
  }
}
```

3. Add a reaction to watch for URL changes:
```typescript
addDisposer(self, reaction(
  () => self.geotiffUrl,
  () => self.updateGeotiffLayer()
))
```

### 4. Implementation Steps

1. Add dependencies to `package.json`
2. Create a new utility file for GeoTIFF handling
3. Implement the GeoTIFF layer management in the map component
4. Add cleanup in the `beforeDestroy` action
5. Add tests for the new functionality

## Testing Strategy

1. Unit Tests:
   - Test GeoTIFF URL changes
   - Test layer cleanup
   - Test error handling (verify silent failure)

2. Integration Tests:
   - Test GeoTIFF loading and display
   - Test interaction with other map layers
   - Test cleanup on unmount

3. E2E Tests:
   - Test full GeoTIFF workflow
   - Test URL changes
   - Test error scenarios

## Error Handling

1. Invalid URLs:
   - Log error to console
   - Remove failed layer
   - Continue without user notification

2. Network Errors:
   - Log error to console
   - Remove failed layer
   - Continue without user notification

3. Invalid GeoTIFF:
   - Log error to console
   - Remove failed layer
   - Continue without user notification

## Performance Considerations

1. Memory:
   - Clean up resources properly
   - Monitor memory usage
   - Implement garbage collection

2. Loading:
   - Handle large files efficiently
   - Clean up resources on failure

## Security Considerations

1. URL Validation:
   - Validate URL format
   - Check for allowed domains
   - Sanitize input

2. File Size:
   - Implement size limits
   - Monitor download progress
   - Handle large files safely

## Future Enhancements

1. Additional Features:
   - GeoTIFF opacity control
   - Layer ordering
   - Multiple GeoTIFF support

2. Performance:
   - Progressive loading
   - Tiling support
   - Compression options 