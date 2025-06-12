<!-- This uses Github flavored markdown. View it directly in Github: https://github.com/concord-consortium/codap/blob/master/docs/touch.md -->

# Touch Support

## SproutCore Event model

SproutCore uses a global event handler, `SC.RootResponder`, which attaches browser event handlers to the `document` and `window`. Upon receipt of a browser event, SproutCore then dispatches a synthetic likeness of the original event to subviews. `SC.RootResponder` implements _bubbling_ up the responder chain in a manner that is analogous to the way browser events bubble up through DOM elements. In some circumstances, however, SproutCore "improves" upon the browser event dispatch model by, for instance, guaranteeing that a `mouseUp` event will always be dispatched to the view that handled the corresponding `mouseDown` event. These changes are intended to make the developer's job easier, but they can be disconcerting when they differ from the more familiar browser event model. 

Note that this approach of attaching event handlers at the document level and then dispatching synthetic events to SproutCore views is analogous to the way React handles/dispatches events to React components. (Another example of SproutCore being ahead of its time. :wink:) The fact that SproutCore event handlers are attached at the `document`/`window` level coupled with the fact that SproutCore's event handlers aren't _capturing_ handlers, means that native event handlers attached to any contained elements will receive browser events before `SC.RootResponder`. As such, native event handlers that call `stopPropagation()` can prevent SproutCore from handling/dispatching the event altogether.

## SproutCore Touch Support

SproutCore has its own [touch support model](https://docs.sproutcore.com/symbols/SC.View.html#:~:text=Touch%20events%20can%20be%20much%20more%20complicated,SC.Touch.). As [described there](https://docs.sproutcore.com/symbols/SC.View.html#:~:text=The%20basic%20touch%20event%20handlers,mouse%20counterparts.), for simple views that rely only on the `mouseDown`, `mouseUp`, and `mouseDragged` event handler methods, it can be sufficient to simply proxy touch event handler methods (`touchStart`, `touchEnd`, `touchesDragged`) to their corresponding mouse event handlers (`mouseDown`, `mouseUp`, and `mouseDragged`). See `DG.SliderView` for an example where this has been done.

The SproutCore touch implementation allows some container views to _capture_ touches such that they won't be dispatched to subviews. `SC.ScrollView` uses this technique to implement touch-scrolling and then sub-dispatches synthetic touch events to the appropriate subviews. Since the `DG.mainPage` is a `SC.ScrollView`, this means that by default CODAP components and their views receive synthetic touch events dispatched by `SC.RootResponder` rather than native browser touch events. Furthermore, by default `SC.RootResponder` calls `preventDefault()` on `touchstart` events it captures, thus preventing the corresponding browser-generated mouse events from being dispatched. As of March 2020, in CODAP we have overridden this behavior so that `DG.mainPage` no longer calls `preventDefault()` on `touchstart` events. It is still the case, however, that by default SproutCore calls `preventDefault()` on `touchend` events after dispatching them to subviews. It is possible for individual subviews to override this behavior, however.

## Enabling Browser-generated Mouse events

For views that require access to browser-generated mouse events and/or `click` events, proxying touch events directly to mouse event handlers is insufficient. This can be true, for instance, when using third-party libraries that respond to browser mouse or `click` events but which are not involved in SproutCore event dispatching. Browser-generated mouse events can be enabled by:

1. returning `YES`/`true` from `touchStart()`.
    - guarantees that the view receives the corresponding `touchEnd()` event.
1. calling `allowDefault()` on the event in `touchEnd()`.
    - instructs SproutCore _not_ to call `preventDefault()` on the corresponding `touchend` event.

Both `DG.CaseCardView` and `DG.CaseTableView` use this technique to enable browser-generated events to be dispatched for the benefit of non-SproutCore libraries. It is worth noting that calling `allowDefault()` on a synthetic event causes SproutCore to not call either `preventDefault()` (which would prevent standard browser behaviors like generating mouse events from touch events) or `stopPropagation()` (which would prevent bubbling of the event to parent DOM elements). If CODAP ever encountered the need to control one or the other of these individually, one would probably need to resort to accessing the `originalEvent` to do so.

## SproutCore touch gesture recognition

(Wait, what? SproutCore has a touch gesture recognition system?!? :dizzy_face:)

For simple views without layered touch recognition requirements, the SproutCore touch gesture recognition system can be used to add support for touch gestures like tap-hold to SproutCore views. At the time of this writing the only place where this has been done is for the icons in the toolbar. The `DG.IconButton` class makes use of the `DG.TapHoldGesture` to show a tooltip when the user tap-holds on a toolbar button. To achieve this, the `DG.IconButton`:

1. adds `gestures: [DG.TapHoldGesture]` to the class definition.
1. calls `gestureTouchStart()` in `DG.IconButton.touchStart()`.
1. calls `gestureTouchEnd()` in `DG.IconButton.touchEnd()`.
1. shows the tooltip in `DG.IconButton.tapHold()`.

See `DG.IconButton` for details.

## Case [Table] Study

In addition to SproutCore views, the case table component contains SlickGrid tables which use a [jQuery plugin](https://github.com/devongovett/jquery.event.drag) to implement dragging. All of these players need to respond to touch events and so there are some subtleties in getting everything to work. The basic interactions supported by the table are:

1. Click in column header shows attribute menu
    - `DG.CaseTableView` implements the techniques above to enable the browser-generated `click` events.
    - The browser-generated `click` event is handled by SlickGrid which emits SlickGrid events that are handled by the `DG.CaseTableView`, e.g. `onHeaderClick` and `onBeforeMenuShow`.
    - The SlickGrid plugin `slick.headermenu` is used to display the menu.
1. Drag from column header initiates a SproutCore-mediated attribute drag
    - The drag must be SproutCore-mediated because drop targets like the graph are SproutCore views.
    - SlickGrid uses `jquery.event.drag` to handle the touch events and then emits SlickGrid events `onHeaderDragInit`, `onHeaderDragStart`, etc.
    - `DG.CaseTableView.handleHeaderDragStart()` initiates a SproutCore drag using `DG.Drag.start()`.
    - SproutCore handles the drag as usual from there.
1. Tap-hold in column header shows attribute tooltip
    - On devices that support persistent cursors, i.e. mouse/touchpad-based devices, we use tooltips to provide additional information about the attribute when the cursor hovers over the column header. On other devices, we support a tap-hold gesture in the column header to display the tooltip instead.
    - To achieve this, `DG.CaseTableView.touchStart()` starts a timer and then `DG.CaseTableView.touchEnd()` clears the timer if the `touchend` occurs too soon (<500 ms). If the timer expires before it is cleared, then the tooltip is shown.
    - To manage the interaction with dragging, `DG.CaseTableView.handleHeaderDragStart()` clears any displayed tooltip as well as any active timer. Thus, `jquery.event.drag`'s handling of `touchmove` events triggers emission of SlickGrid events which triggers SproutCore view methods to clear the timer when the touch has moved.
1. Vertical scrolling in table body
    - Since there are no SproutCore-mediated touch interactions in the body of the table, we add the `dg-wants-touch` class to indicate that SproutCore should simply ignore any touch events in the body of the table.
    - To eliminate confusion between scrolling gestures and row-selection gestures, we disable touch drag-selection to select a range of rows in the table body. It is still possible to click-select individual rows of the table (mediated by SlickGrid).
    - To enable momentum-scrolling on iOS devices, we add `-webkit-overflow-scrolling: touch` to the table body.
1. Horizontal scrolling in table body
    - For historical reasons, horizontal scrolling is handled directly by SproutCore using a visible SproutCore scrollbar.
    - We added the necessary methods to proxy touch events to mouse events in `SC.Scroller`, since it had not already been done, despite the claim in the documentation that all SproutCore controls were already touch-enabled.

## Conclusion

While handling touch events in the context of CODAP, SproutCore, SlickGrid, jQuery, React, etc. can sometimes feel like a jenga puzzle, in the end it's generally possible to achieve the desired effect once the interactions between the players are understood. It is hoped that this document will provide a useful starting point for any future such efforts.
