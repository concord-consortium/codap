# Understanding Cell Keys in CODAP V3 Graphs

## The Problem Cell Keys Solve

When a CODAP graph has **categorical attributes** on its axes, the graph is divided into a grid of **subplots** (also called "cells"). Each cell represents a unique combination of category values.

For example, consider a graph with:
- X-axis: `Diet` (categories: "plant", "meat", "both")
- Y-axis: `Habitat` (categories: "land", "water", "air")

This creates a 3×3 grid of 9 cells. Each cell contains only the cases that match that specific combination (e.g., land-dwelling plant-eaters).

A **cell key** is the data structure that identifies which cell we're talking about.

## What Is a Cell Key?

A cell key is a simple JavaScript object that maps **attribute IDs** to **category values**:

```typescript
type GraphCellKey = Record<string, string>

// Example: The cell for Diet="plant" and Habitat="land"
const cellKey = {
  "ATTR-123": "plant",   // Diet attribute ID → category value
  "ATTR-456": "land"     // Habitat attribute ID → category value
}
```

Key points:
- Keys are **attribute IDs** (like `"ATTR-123"`), not attribute names (like `"Diet"`)
- Values are the **category strings** for that attribute
- A cell key only includes attributes that are categorical and placed on axes/splits

## The Four Axes That Can Be Categorical

CODAP graphs can have categorical attributes in up to four positions:

| Role | Position | Description |
|------|----------|-------------|
| `x` | Bottom axis | Primary horizontal categories |
| `y` | Left axis | Primary vertical categories |
| `topSplit` | Top | Splits graph horizontally into panels |
| `rightSplit` | Right | Splits graph vertically into panels |

Note that `topSplit` and `rightSplit` are often referred to as "secondary."

A cell key can have entries for any combination of these, depending on which axes have categorical attributes assigned.

## Special Values

### `kMain` (`"__main__"`)

When an axis has **no categorical attribute**, its "category" is `kMain`. This acts as a **wildcard** in matching operations.

```typescript
// A graph with only X categorical, Y is numeric
const cellKey = {
  "ATTR-123": "plant",
  "ATTR-456": "__main__"  // Y has no categories, so kMain
}
```

### `kOther` (`"__other__"`)

When there are too many categories to display (exceeding the category limit), overflow categories are grouped into a special `kOther` bucket.

```typescript
// This cell represents all the "other" categories on the X axis
const cellKey = {
  "ATTR-123": "__other__"
}
```

### `kImpossible` (`"__IMPOSSIBLE__"`)

When the **same attribute** appears on multiple axes with **different values**, the cell key is marked as impossible (no case can exist there):

```typescript
// Same attribute on X and Y with different values - impossible!
const cellKey = {
  "ATTR-123": "plant",
  "__IMPOSSIBLE__": "meat"  // Conflict marker
}
```

## Key Functions and Where to Find Them

### Creating Cell Keys

**`graph-data-configuration-model.ts`:**

```typescript
// Get a cell key by index (0 to totalCells-1)
cellKey(index: number): Record<string, string>

// Get all cell keys for the current graph configuration
getAllCellKeys(): Record<string, string>[]

// Build a cell key from a specific case ID
subPlotKey(caseId: string): Record<string, string>
graphCellKeyFromCaseID(caseId: string): Record<string, string>
```

### Filtering Cases by Cell Key

**`graph-data-configuration-model.ts`:**

```typescript
// Get all cases in a subplot (cached)
subPlotCases(cellKey: Record<string, string>): string[]

// Get cases filtered by different dimensions (cached)
cellCases(cellKey): string[]    // Only topSplit + rightSplit
rowCases(cellKey): string[]     // y + topSplit + rightSplit
columnCases(cellKey): string[]  // x + topSplit + rightSplit
```

### Utility Functions

**`cell-key-utils.ts`:**

```typescript
// Convert to stable string (for cache keys)
cellKeyToString(cellKey: Record<string, string>): string
```

**`adornment-utils.ts`:**

```typescript
// Build up a cell key incrementally
updateCellKey(cellKey, attrId, category): Record<string, string>
```

### For Adornments

**`adornment-models.ts`:**

```typescript
// Convert cell key to string for use as map key (uses JSON.stringify)
instanceKey(cellKey: Record<string, string>): string

// Convert to CSS-safe class name
classNameFromKey(cellKey: Record<string, string>): string
```

## Common Patterns

### Iterating Over All Cells

```typescript
const dataConfig = useGraphDataConfigurationContext()

dataConfig.getAllCellKeys().forEach((cellKey, index) => {
  const casesInCell = dataConfig.subPlotCases(cellKey)
  // Do something with cases in this cell
})
```

### Getting Cases for the Current Cell (in an adornment)

```typescript
function MyAdornmentComponent({ cellKey }: { cellKey: Record<string, string> }) {
  const dataConfig = useGraphDataConfigurationContext()
  const cases = dataConfig.subPlotCases(cellKey)
  // Render something based on cases
}
```

### Storing Per-Cell Data in an Adornment Model

Adornment models often need to store data (like computed values or user-placed labels) for each cell. They use `instanceKey()` to convert cell keys to strings for use as map keys:

```typescript
// In an adornment model
.props({
  values: types.map(types.number)  // Map<string, number>
})
.views(self => ({
  getValue(cellKey: Record<string, string>) {
    return self.values.get(self.instanceKey(cellKey))
  }
}))
.actions(self => ({
  setValue(cellKey: Record<string, string>, value: number) {
    self.values.set(self.instanceKey(cellKey), value)
  }
}))
```

**Important:** `instanceKey()` uses `JSON.stringify` because these keys are **persisted** in saved documents. Don't change this format without migration code.

## Cache Keys vs Instance Keys

There are two different string representations of cell keys:

| Function | Format | Purpose | Can Change? |
|----------|--------|---------|-------------|
| `cellKeyToString()` | `"attrId1:value1|attrId2:value2"` | Cache keys (transient) | Yes |
| `instanceKey()` | `JSON.stringify(...)` | Map keys (persisted) | No* |

*Changing `instanceKey` format would break saved documents.

## Debugging Tips

1. **Log the cell key structure:**
   ```typescript
   console.log("cellKey:", JSON.stringify(cellKey, null, 2))
   ```

2. **Check what cases are in a cell:**
   ```typescript
   const cases = dataConfig.subPlotCases(cellKey)
   console.log(`Cell has ${cases.length} cases:`, cases)
   ```

3. **Verify cell key creation:**
   ```typescript
   const allKeys = dataConfig.getAllCellKeys()
   console.log(`Graph has ${allKeys.length} cells`)
   allKeys.forEach((key, i) => console.log(`Cell ${i}:`, key))
   ```

## Summary

- A **cell key** identifies a subplot in a categorical graph
- It maps **attribute IDs** to **category values**
- Special values: `kMain` (wildcard), `kOther` (overflow), `kImpossible` (conflict)
- Use `subPlotCases(cellKey)` to get cases in a cell
- Use `instanceKey(cellKey)` when storing per-cell data in adornment models
- Use `cellKeyToString(cellKey)` for transient cache keys
