# Analysis: `componentMode` URL Parameter Behavior in CODAP

The `componentMode` URL parameter (values: `'yes'` or `'no'`, default: `'no'`) controls a special mode designed for embedding a single CODAP component. Here are all the features/behaviors that must be implemented in the rewrite:

---

## 1. URL Parameter Definition

**Source:** [apps/dg/core.js#L353-358](../apps/dg/core.js#L353-L358)

```javascript
componentMode: getUrlParameter('componentMode', 'no')
```

**Behavior to implement:**
- Parse the `componentMode` URL parameter with a default value of `'no'`
- Expose it as a global application setting (e.g., via React context or state management)

---

## 2. Hide Navigation Bar (CFM Menu Bar)

**Source:** [apps/dg/resources/main_page.js#L114](../apps/dg/resources/main_page.js#L114)

```javascript
isVisible: !(kIsComponentMode || kIsEmbeddedMode),
```

**Behavior to implement:**
- When `componentMode === 'yes'`, hide the top navigation bar (the CFM/Cloud File Manager bar)

---

## 3. Hide Toolbar (Tool Shelf)

**Source:** [apps/dg/resources/main_page.js#L261-267](../apps/dg/resources/main_page.js#L261-L267)

```javascript
if (kIsComponentMode || kIsEmbeddedMode) {
  this.setPath('topView.isVisible', false);
  tScrollView.adjust('top', 0);
  tScrollView.set('hasHorizontalScroller', false);
  tScrollView.set('hasVerticalScroller', false);
}
```

**Behaviors to implement:**
- Hide the main toolbar (topView/tool shelf)
- Adjust the main scroll view to start at top: 0
- **Disable horizontal scrollbar** on the main content area
- **Disable vertical scrollbar** on the main content area

---

## 4. Hide Component Borders and Resize Handles

**Source:** [apps/dg/views/component_view.js#L201-203](../apps/dg/views/component_view.js#L201-L203)

```javascript
childViews: ('containerView' +
              (DG.get('componentMode') === 'no'
                ? ' borderRight borderBottom borderLeft borderBottomLeft borderBottomRight resizeBottomRight'
                : '')).w(),
```

**Behavior to implement:**
- When `componentMode === 'yes'`, don't render the component border views:
  - `borderRight`
  - `borderBottom`
  - `borderLeft`
  - `borderBottomLeft`
  - `borderBottomRight`
  - `resizeBottomRight` (resize handle)

---

## 5. Lock Down Component UI (Hide Close/Minimize Buttons)

**Source:** [apps/dg/views/component_view.js#L52](../apps/dg/views/component_view.js#L52) and [L218-219](../apps/dg/views/component_view.js#L218-L219)

```javascript
kLockThingsDown = kViewInComponentMode;
...
childViews: ('statusView versionView titleView ' +
(!kLockThingsDown ? 'minimize closeBox ' : '') +
(kShowUndoRedoButtons ? 'undo redo ' : '')).w(),
```

**Behavior to implement:**
- When `componentMode === 'yes'`, hide the **minimize button** in the component title bar
- When `componentMode === 'yes'`, hide the **close button** in the component title bar

---

## 6. Show Undo/Redo Buttons in Component Title Bar

**Source:** [apps/dg/views/component_view.js#L51](../apps/dg/views/component_view.js#L51)

```javascript
kShowUndoRedoButtons = (kViewInComponentMode || kViewInEmbeddedMode) && !kHideUndoRedoInComponent,
```

**Behavior to implement:**
- When `componentMode === 'yes'` (and `hideUndoRedoInComponent !== 'yes'`), show **undo/redo buttons** in the component's title bar
- This provides undo/redo functionality when the main toolbar is hidden

---

## 7. Auto-Select Component on Load

**Source:** [apps/dg/views/component_view.js#L152-157](../apps/dg/views/component_view.js#L152-L157)

```javascript
if (kViewInComponentMode && this.get('isVisible')) {
  this.invokeLater(function () {
    this.select();
  }.bind(this));
}
```

**Behavior to implement:**
- When `componentMode === 'yes'`, automatically select the component after it renders
- This ensures the single component is focused and ready for interaction

---

## 8. Suppress "Unsaved Changes" Browser Warning

**Source:** [apps/dg/controllers/app_controller.js#L264-268](../apps/dg/controllers/app_controller.js#L264-L268)

```javascript
window.onbeforeunload = function(iEvent) {
  if(DG.currDocumentController().get('hasUnsavedChanges') &&
     (DG.get('embeddedMode') === 'no') &&
     (DG.get('componentMode') === 'no')) {
    return 'DG.AppController.beforeUnload.confirmationMessage'.loc();
  }
};
```

**Behavior to implement:**
- When `componentMode === 'yes'`, **skip the browser beforeunload confirmation** for unsaved changes
- The parent embedding context is expected to handle document persistence

---

## 9. Don't Update Page Title

**Source:** [apps/dg/controllers/document_controller.js#L250-253](../apps/dg/controllers/document_controller.js#L250-L253)

```javascript
setPageTitle: function () {
  if ((DG.get('componentMode') === 'yes') || (DG.get('embeddedMode') === 'yes')) {
    return;
  }
  // ... otherwise update document.title
}
```

**Behavior to implement:**
- When `componentMode === 'yes'`, **don't modify the browser page title** based on the document name
- The parent page controls the page title

---

## 10. Hide Splash Screen

**Source:** [apps/dg/resources/splash.js#L27](../apps/dg/resources/splash.js#L27) and [L52](../apps/dg/resources/splash.js#L52)

```javascript
if (hideSplashImage && DG.get('componentMode') !== 'yes') { ... }
...
&& DG.get('componentMode') !== 'yes'
```

**Behavior to implement:**
- When `componentMode === 'yes'`, **don't show the CODAP splash screen**
- Skip all splash screen logic entirely in component mode

---

## Summary Table

| Feature | `componentMode === 'no'` (default) | `componentMode === 'yes'` |
|---------|-----------------------------------|--------------------------|
| Navigation bar (CFM) | Visible | Hidden |
| Toolbar (tool shelf) | Visible | Hidden |
| Scrollbars | Enabled | Disabled |
| Component borders | Visible | Hidden |
| Component resize handles | Visible | Hidden |
| Close/Minimize buttons | Visible | Hidden |
| Undo/Redo in title bar | Hidden | Visible (unless `hideUndoRedoInComponent=yes`) |
| Auto-select component | No | Yes |
| Unsaved changes warning | Enabled | Disabled |
| Page title updates | Enabled | Disabled |
| Splash screen | Shown | Hidden |

---

## Implementation Notes for Rewrite

1. **Create a context/store for URL parameters** - Store `componentMode` in a React context or global state (e.g., Zustand, Redux, or React Context)

2. **Conditional UI rendering** - Use the `componentMode` flag to conditionally render/hide:
   - Navigation bar component
   - Toolbar component
   - Component chrome (borders, resize handles, close/minimize buttons)
   - Splash screen

3. **CSS adjustments** - When in component mode:
   - Set `overflow: hidden` on main container (no scrollbars)
   - Remove border/resize styling from component containers

4. **Lifecycle hooks** - Handle:
   - Skipping `window.onbeforeunload` setup
   - Skipping `document.title` updates
   - Auto-focusing/selecting the component on mount
