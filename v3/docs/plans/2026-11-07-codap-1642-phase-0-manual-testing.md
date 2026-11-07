# CODAP-1642 Phase 0: Manual Regression Testing

Phase 0 refactored shared map code without adding features. The checks below cover what automated tests can't,
mainly rendering and live updates on a real map. Unless noted, the expected result is "same as `main`".

Use a dataset with lat/long attributes (e.g. the Four Seals or Roller Coasters sample) on a map.

## Points

- [ ] Points render in the right places at several zoom levels.
- [ ] Pan the map across the antimeridian (±180° longitude). Points stay drawn and line up with the map tiles.
- [ ] Select, hover, and drag-select points. Highlighting works as before.
- [ ] Edit a lat or long value in the table. The point moves.
- [ ] Drag a point (caching edit). The point moves smoothly during the drag and ends up in the right place.
- [ ] Add a case and delete a case. The map updates.
- [ ] Hide, set aside, and filter cases (and restore them). The map updates each time.
- [ ] Change the lat attribute's type to categorical and back. Points disappear and reappear.
- [ ] Clear the lat or long value for a case. That case is no longer drawn.

## Connecting lines

- [ ] Turn on connecting lines. They render, including after panning across the antimeridian.
- [ ] **Changed behavior:** edit a lat/long value, or add or delete a case. The lines update right away.
      Previously they could stay stale until something else triggered a redraw.

## Heatmap

- [ ] Switch the point display to heatmap. It renders as before.
- [ ] Edit a value, add or delete a case, or hide cases. The heatmap updates.

## Grid

- [ ] Turn on the grid. The cell counts and colors are correct.
- [ ] Change the grid size with the slider, both while dragging and after release.
- [ ] **Bug fix:** edit a case's lat/long so that it moves to another cell. The counts update. Previously they
      stayed stale.
- [ ] Select cases. Grid cell selection updates.

## Pins

- [ ] Add a pin dataset to the map. Pins render in the right places, including across the antimeridian.
- [ ] Drag a pin. It moves correctly.

## Outside the map

- [ ] In a formula, `greatCircleDistance(lat1, long1, lat2, long2)` returns the same values as before
      (kilometers).
- [ ] On a graph, points drawn with non-circle shapes (such as stars and polygons) look the same as before.
- [ ] Color interpolation, such as the legend gradient for a numeric legend attribute, looks the same as before.
