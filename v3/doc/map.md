# Creation behaviors

## Map created from application toolbar

When a map is created by the user clicking on the map toolbar button:
- if there is no dataset with latitude longitude attributes, the map will automatically center on the user's current location.
- if there is a dataset with latitude longitude attributes, the new map will fit the bounds of the points of this dataset.

## Map created by a plugin
When a map is created by the plugin api:
- the plugin can specify a center and zoom for the map, this will override any changes below
- if there is no dataset with latitude longitude attributes, the map will automatically center on the user's current location.
- if there is a dataset with latitude longitude attributes, the new map will fit the bounds of the points of this dataset.

# Other Map behaviors

If a new layer is added to the map, this should rescale the map to fit the bounds of the points of this layer plus the points any existing layers. It isn't clear if this is working properly.

If a new point is added to a dataset being shown on the map, the map will not automatically rescale to show this new point.

Once the map has been created the map bounds should be preserved when it is reloaded or new points are added to it.

# Current implementation

There are 3 places the bounds of a map are stored:
- `MapContentModel` is the MST object which is serialized into the document to save the map state.
- `LeafletMapState` this proxies the actual Leaflet object as a MobX object, so changes to Leaflet can be observed by components and reactions.
- `LeafletMap` this is the actual Leaflet object provided by the Leaflet library.

## MapContentModel (map-content-model.ts)
This has reactions for syncing the center and zoom from itself to the `LeafletMapState` and from the `LeafletMapState` to itself.

A `rescale` action which computes the bounds of the all of the points of all of the datasets shown on the map, and calls `LeafletMapState.adjustMapView` to update Leaflet itself. This update of Leaflet itself triggers the listeners added by `LeafletMapState` to `LeafletMap`. The `LeafletMapState` listeners then update the `LeafletMapState` properties. The sync method in `MapContentModel` then updates its properties.

A reaction listens for changes to the map layers and calls `rescale` when the layers change. This way when a new dataset is added to the map, the map bounds should be adjusted to show all of the new points.

## LeafletMapState (leaflet-map-state.ts)

In addition to providing an observable MobX proxy of the LeafletMap, this object also handles creating undo-able actions when the user uses Leaflet's UI to pan and zoom the map.

Because LeafletMap sends events while the user is panning or zooming the map, if these events were synced immediately to the `MapContentModel` this would result in many undo-able actions for single pan or zoom operations. This is avoided by using Leaflet's `movestart` `moveend`, and `zoomstart` `zoomend` events. The incremental `zoom` and `move` events update the `zoom` and `center` properties of `LeafletMapState`. But these are not sync'd to the `MapContentModel` immediately because the syncing reaction in `MapContentModel` only updates itself when `LeafletMapState.isChanging` is false. This `isChanging` view becomes true when a `zoomstart` or `movestart` happens, and it goes back to false when the corresponding `zoomend` and `moveend` happen.

Additionally it includes a debouncing feature. When `LeafletMapState.adjustMapView` is called a debounced `completeMapViewChange` method created. Then the actual function runs it removes itself again. The function is called at the end of `adjustMapView`. The `LeafletMapState.isChanging` monitors the presence of this method. The effect of this is that when `adjustMapView` is first called `isChanging` becomes true. And then if `adjustMapView` is called again within the debounced time `isChanging` stays true. When there are no more `adjustMapView` calls one after another then finally `isChanging` will become false as long as the `zoomend` and `moveend` have also been called. This approach prevents lots of changes from being synced to the `MapContentModel`. When the map tile is animated into place `adjustMapView` is called many times in succession, so the debouncing above handles this case and generally the changes are not sync'd to the `MapContentModel` until the animation is done.

This same debouncing approach is used with `zoomstart` and `movestart`. In this case the method is `completeLeafletInteraction`. This way if Leaflet triggers multiple `zoomstart`s and `movestart`s they will grouped into one change synced to the `MapContentModel`.

The `LeafletMapState` is a way to separate out the proxy of the listener based Leaflet api to an observable MobX api from the map content model. While this approach reduces the code in the map content model, it does complicate things because there are now 3 places where the map state is stored: leaflet, contentModel, and leafletMapState.

In most cases the React components use the `LeafletMapState` to make changes. The plugin api uses the `MapContentModel` to make changes. When methods on the `LeafletMapState` are called to change Leaflet, it does not update the properties in `LeafletMapState` directly. Instead the methods update the LeafletMap object and then Leaflet fires events which listeners in `LeafletMapState` handle and update the `LeafletMapState` properties. So the `LeafletMap` is the source of truth.

## MapInterior (map-interior.tsx)

This is an observing component that calls `useMapModel()` and renders the main map layers.

## useMapModel (use-map-model.ts)

This hook handles the creation behaviors described above. It waits for the shared datasets of map to be initialized and the initial tile extents set.

Importantly, this initialization will happen as soon as the map is rendered. If the map is being animated into place, the width and height of the map will start out as 0. Leaflet correctly handles the setting of its zoom and center properties even if the width and height of the map are 0. Leaflet cannot handle "fitting the bounds" of a latitude longitude range when the width and height are 0. Fitting the bounds needs the aspect ratio of the displayed map so Leaflet can compute the correct zoom which will show the range. See below for how this is handled.

If the MapContentModel has a zoom set, then it updates Leaflet with the zoom and center values of the MapContentModel. This handles two cases:
1. When a plugin sets the zoom and center
2. When the MapContentModel is reloaded from a saved CODAP document
It is fine to do this immediately because setting Leaflet's zoom and center is independent from the width and height of the displayed map.

If there is no zoom set, and there are no layers, then the user's current position is used for the center value and a default zoom level is used for the zoom. This is also fine to do immediately because it is just setting the center and zoom.

If there is no zoom set and there are layers, then we need to automatically adjust the map bounds to show all the data. This is done by computing the latitude and longitude range of the points and then passing this range to Leaflet's `fitBounds` method. However as described above this has to be done on a map that has the correct width and height. When the map tile is animating into place its width and height start at 0 and animate to their final values.

This problem is addressed by making a temporary `LeafletMap` object that is the final size of the Map and then calling `fitBounds` on that temporary `LeafletMap`. Then we get the center and zoom of the temporary `LeafletMap` and apply those values immediately to the actual `LeafletMap` via `LeafletMapState.adjustMapView`. These center and zoom values are basically preserved as the map animates into place.

There is a wrinkle with this approach when the plugin API creates a map with a legend. This legend takes up more the height of the tile, so the height of the map is smaller. It isn't easy to know this legend height when creating the temporary `LeafletMap`. This issue seems minor and plugins can work around it by setting the center and zoom of the map themselves.

Originally this problem was solved by trying to wait for the animation to finish before calling `fitBounds`. It is very difficult to make that work correctly. We know when the CSS transition ends, but the actual size of the Leaflet container isn't updated until a resize observer sees the new tile size and updates the data configuration layout, which triggers the CodapMap to re-render and use the new size. On top of this, while the map tile is animating into place `LeafletMapState.adjustMapView({invalidateSize: true})` is being called each time the `CodapMap` re-renders during the animation. This is done so Leaflet re-renders in its new space. However each of these calls to `invalidateSize` causes Leaflet to fire `move` events which slightly adjust the center of the map. This eventually causes the center and zoom properties of `LeafletMapState` to be sync'd to the `MapContentModel`. Because of the debouncing described above this syncing might not actually take effect until after the animation completes but if there are are slow downs in the browser the syncing might happen during the animation. The result of all of this is that when the animation is done, sometimes the zoom of the `MapContentModel` would remain the default `-1` value and sometimes it would be set to `0`. That makes it hard to know if we should rescale the map at the end of the animation or not. It is possible to work around these nuances, but this is more complicated than the temporary leaflet approach. Additionally the temporary leaflet approach should result in a nicer looking animation.

## Undo Redo
The `LeafletMapState` object stores a undoStringKey and redoStringKey. Whenever the component calls the actions on `LeafletMapState` it will set these keys if the change should be undo-able. Then when the reaction in the map content model observes a change in `LeafletMapState` it uses these keys to record the change in the content model as undo able.

See above for info about the `isChanging` property of `LeafletMapState` which is a key part of preventing extra undo-able changes.
