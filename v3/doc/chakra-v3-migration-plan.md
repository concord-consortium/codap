# Chakra UI v2 to v3 Migration Plan for CODAP

## Executive Summary

Upgrading from Chakra UI v2.8.2 to v3 is a **major undertaking**. Chakra UI v3 is essentially a complete rewrite with fundamental changes to the theming system, component APIs, and architecture. The migration cannot be done incrementally—v2 and v3 providers conflict when used together.

**Impact Assessment:**
- **83 files** currently import Chakra UI components
- **5 theme/style configuration files** need complete rewrites
- **12 SCSS files** with Chakra class name overrides need updates
- **45+ unique components** in use across the codebase

---

## Current Usage Summary

### Packages in Use
- `@chakra-ui/react`: ~2.8.2
- `@chakra-ui/icons`: ^2.2.4

### Most Frequently Used Components
| Component | Occurrences | Migration Impact |
|-----------|-------------|------------------|
| `useDisclosure` | 16 | API changes (isOpen → open) |
| `MenuItem` | 14 | Compound component (Menu.Item) |
| `Flex` | 14 | Minimal changes |
| `MenuList` | 13 | Compound component (Menu.Content) |
| `Button` | 13 | colorScheme → colorPalette |
| `Checkbox` | 9 | Compound component, boolean props |
| `Portal` | 8 | Minimal changes |
| `Menu` | 8 | Full restructure to compound |
| `Box` | 7 | Minimal changes |
| `Modal` | Multiple | **Renamed to Dialog**, full restructure |

### Theme Customizations
- **Location:** `src/theme.ts` + `src/styles/*.ts`
- Uses `extendTheme` (replaced in v3)
- Uses `createMultiStyleConfigHelpers` for multi-part components
- Custom color palette (tealDark, tealLight1-5, etc.)
- Custom component variants for Button, Menu, Modal, Checkbox, Input

---

## Major Breaking Changes

### 1. Theming System (High Impact)

**v2 Approach:**
```typescript
import { extendTheme } from "@chakra-ui/react"
const theme = extendTheme({
  colors: { tealDark: "#006c8e" },
  components: { Button: { variants: {...} } }
})
```

**v3 Approach:**
```typescript
import { createSystem, defaultConfig } from "@chakra-ui/react"
const system = createSystem(defaultConfig, {
  theme: {
    tokens: {
      colors: { tealDark: { value: "#006c8e" } }
    },
    recipes: { button: {...} }
  }
})
```

**Work Required:**
- Rewrite `src/theme.ts` completely
- Convert all 4 style config files to "recipes"
- All token values must be wrapped in `{ value: "..." }`

### 2. Provider Architecture (Medium Impact)

**v2:**
```tsx
<ChakraProvider theme={theme}>
```

**v3:**
```tsx
<ChakraProvider value={system}>
  <ColorModeProvider>  {/* from next-themes */}
```

**Work Required:**
- Update `src/index.tsx`
- Add `next-themes` dependency
- Create custom Provider wrapper

### 3. Component API Changes (High Impact)

#### Boolean Props
All `is*` prefixed props become lowercase:
- `isOpen` → `open`
- `isDisabled` → `disabled`
- `isInvalid` → `invalid`
- `isLoading` → `loading`
- `isChecked` → `checked`
- `isRequired` → `required`

**Files affected:** ~40+ files using these props

#### Compound Components
Many components now use dot notation:

| v2 | v3 |
|----|-----|
| `<Modal><ModalOverlay/><ModalContent/>` | `<Dialog.Root><Dialog.Backdrop/><Dialog.Content/>` |
| `<Menu><MenuButton/><MenuList><MenuItem/>` | `<Menu.Root><Menu.Trigger/><Menu.Content><Menu.Item/>` |
| `<Checkbox>Label</Checkbox>` | `<Checkbox.Root><Checkbox.Control/><Checkbox.Label/>` |
| `<FormControl><FormLabel/>` | `<Field.Root><Field.Label/>` |
| `<Editable><EditableInput/>` | `<Editable.Root><Editable.Input/>` |
| `<Radio>` | `<Radio.Root><Radio.Control/>` |
| `<Popover>` | `<Popover.Root>` |
| `<Slider>` | `<Slider.Root>` |

#### Component Renames
- `Modal` → `Dialog`
- `Collapse` → `Collapsible`
- `CircularProgress` → `ProgressCircle`
- `Divider` → `Separator`
- `FormControl` → `Field`

### 4. Icons Package Removed (Medium Impact)

`@chakra-ui/icons` is deprecated. Must migrate to `lucide-react` or `react-icons`.

**Current usage (3 files):**
- `TriangleDownIcon`, `TriangleUpIcon`
- `ExternalLinkIcon`
- `ChevronDownIcon`

### 5. Hooks Changes (High Impact)

**Removed/Changed hooks:**
- `useDisclosure` - API changes (isOpen → open, onOpen/onClose → setOpen)
- `useColorMode`, `useColorModeValue` - removed, use `next-themes`
- `forwardRef` from Chakra - use React's `forwardRef`
- `useMergeRefs` - verify compatibility
- `useOutsideClick` - removed, use alternative
- `useInterval` - removed, use `react-use` or `usehooks-ts`
- `useEditableControls` - likely changed with compound pattern

### 6. Style Props Changes (Low-Medium Impact)

- `colorScheme` → `colorPalette`
- `noOfLines` → `lineClamp`
- `truncated` → `truncate`
- Nested selectors require `css` prop with `&` prefix
- Gradient props split: `bgGradient`, `gradientFrom`, `gradientTo`

### 7. Animation Changes (Low Impact)

Framer-motion removed. Animations now use CSS. The custom `CodapModal` with draggable functionality may need updates if it relies on framer-motion.

---

## Migration Strategy

### Option A: Big Bang Migration (Recommended)

Migrate everything at once since v2 and v3 providers conflict.

**Phases:**

#### Phase 1: Preparation
1. Create a feature branch
2. Update Node.js to v20+ if needed
3. Read and understand all v3 documentation
4. Set up v3 in a test environment
5. Generate component snippets using CLI: `npx @chakra-ui/cli snippet add`

#### Phase 2: Core Infrastructure
1. Update dependencies:
   - Remove: `@chakra-ui/icons`, `@emotion/styled`, `framer-motion` (if present)
   - Update: `@chakra-ui/react`, `@emotion/react`
   - Add: `next-themes`, `lucide-react` (or `react-icons`)
2. Rewrite `src/theme.ts` using `createSystem`
3. Convert style configs to recipes
4. Update Provider in `src/index.tsx`

#### Phase 3: Component Migration (Largest Phase)
Migrate components in order of dependency:
1. Layout components (Box, Flex, Stack) - minimal changes
2. Form components (Input, Checkbox, Radio, FormControl→Field)
3. Button components
4. Menu components (heavy usage)
5. Modal→Dialog components (heavy customization)
6. Other components (Popover, Tooltip, Editable, Slider, etc.)

#### Phase 4: Testing & Refinement
1. Run full test suite
2. Visual regression testing
3. Fix SCSS overrides (class names may change)
4. Update Cypress tests

### Option B: Abstraction Layer First

1. Create wrapper components around current Chakra usage
2. Migrate to v3 behind the abstraction
3. Higher initial effort but cleaner long-term

Not recommended for CODAP given the extent of direct Chakra usage.

---

## Effort Estimation

### By Category

| Category | Files | Complexity | Estimated Effort |
|----------|-------|------------|------------------|
| Theme/Style System | 5 | High | 2-3 days |
| Modal→Dialog Components | ~10 | High | 2-3 days |
| Menu Components | ~12 | High | 2-3 days |
| Form Components | ~15 | Medium | 2-3 days |
| useDisclosure Hooks | 16 | Medium | 1-2 days |
| Other Components | ~30 | Low-Medium | 2-3 days |
| SCSS Overrides | 12 | Medium | 1-2 days |
| Icons Migration | 3 | Low | 0.5 day |
| Testing/Fixes | - | Variable | 3-5 days |
| **Total** | **83 files** | | **15-25 days** |

### Risk Factors That Could Increase Effort

1. **CodapModal custom wrapper** - Uses draggable functionality and heavy customization
2. **Multi-part component styles** - Recipe system is fundamentally different
3. **Undocumented changes** - Many developers report issues not covered in migration guide
4. **No codemods available** - All changes must be manual
5. **Incomplete v3 documentation** - Some features still being documented

---

## Detailed File Impact List

### High Impact (Significant Rewrites)
- `src/theme.ts` - Complete rewrite
- `src/styles/menu-style.ts` - Convert to recipe
- `src/styles/modal-style.ts` - Convert to recipe
- `src/styles/checkbox-style.ts` - Convert to recipe
- `src/styles/input-style.ts` - Convert to recipe
- `src/components/codap-modal.tsx` - Modal→Dialog + compound
- All modal components using CodapModal
- All menu components (Menu.*, compound pattern)

### Medium Impact (API Updates)
- All files using `useDisclosure` (16 files)
- All files using `isOpen`, `isDisabled`, etc.
- Form components using FormControl→Field
- Checkbox/Radio components
- Files using `colorScheme` prop

### Low Impact (Minor Updates)
- Files only using Box, Flex, Text, Stack
- Files using Portal, Tooltip (minimal changes)

---

## Alternatives to Consider

### 1. Stay on Chakra UI v2

**Pros:**
- No immediate work required
- v2 is still maintained for critical security fixes
- Stable, known quantity

**Cons:**
- v2 will eventually become unmaintained (timeline unclear)
- Missing out on v3 performance improvements (4x reconciliation, 1.6x re-render)
- Harder to find help/resources as community moves to v3
- Technical debt accumulates

**Recommendation:** Viable short-term but not a long-term solution.

---

### 2. Migrate to a Different UI Library

Since Chakra v3 is essentially a rewrite requiring changes to nearly every file that uses it, the effort to migrate to a completely different library may be comparable. This is worth serious consideration.

#### Why This Makes Sense

1. **Chakra v3 requires learning new patterns anyway** - Compound components, recipes, new APIs
2. **No incremental migration path** - Either library requires a "big bang" approach
3. **Similar file count affected** - All 83 files need updates regardless
4. **Theme system rewrite required** - Must rebuild theming either way
5. **Opportunity to evaluate current needs** - CODAP's requirements may have evolved

#### Library Comparison

| Criteria | Chakra v3 | Radix + Tailwind | shadcn/ui | Mantine |
|----------|-----------|------------------|-----------|---------|
| **Component count** | Comprehensive | Primitives only | Comprehensive | Comprehensive |
| **Styling approach** | Recipes (Panda CSS) | Your choice | Tailwind | CSS-in-JS / CSS Modules |
| **Bundle size** | Medium | Small (primitives) | Small (copy-paste) | Medium |
| **Learning curve** | High (new patterns) | Medium | Low | Low (similar to Chakra v2) |
| **Customization** | Recipe system | Full control | Full control | Theme object |
| **Accessibility** | Built-in | Built-in | Built-in | Built-in |
| **React 18 support** | Yes | Yes | Yes | Yes |
| **Community/Docs** | Large but v3 docs incomplete | Excellent | Excellent | Excellent |
| **Long-term stability** | Uncertain (major rewrites) | Stable (primitives) | Stable | Stable |

#### Option A: Radix UI + Custom Styling

**What it is:** Unstyled, accessible component primitives. You provide all styling.

**Pros:**
- Chakra v3 is built on Radix patterns—similar compound component APIs
- Maximum flexibility in styling approach
- Smaller bundle size (only ship what you use)
- Very stable API (primitives rarely change)
- Could keep existing SCSS approach

**Cons:**
- More work upfront to style everything
- No pre-built theme system
- Need to build your own design tokens

**Effort estimate:** 20-30 days (more styling work, but simpler component APIs)

**Best for:** Teams wanting full control and long-term stability

#### Option B: shadcn/ui

**What it is:** Copy-paste component collection built on Radix + Tailwind CSS.

**Pros:**
- Components are copied into your codebase (full ownership)
- Well-documented with clear examples
- Active community and frequent updates
- No dependency on library updates—you own the code
- Modern, clean design out of the box
- Tailwind integration (if desired)

**Cons:**
- Requires Tailwind CSS adoption (significant change)
- Components are your responsibility to maintain
- Would need to adapt CODAP's teal color scheme

**Effort estimate:** 20-30 days (includes Tailwind setup if not already using)

**Best for:** Teams wanting ownership of UI code and modern tooling

#### Option C: Mantine

**What it is:** Full-featured React component library with API similar to Chakra v2.

**Pros:**
- **Most similar to Chakra v2** - familiar API patterns
- `isOpen`, `isDisabled` props still used (no boolean prop migration)
- Theme object similar to Chakra v2's `extendTheme`
- Comprehensive component library
- Excellent documentation
- Stable API with clear migration paths between versions
- Active maintenance

**Cons:**
- Still requires updating all import statements
- Theme tokens need recreation
- Some component names/structures differ

**Effort estimate:** 15-20 days (familiar patterns reduce learning curve)

**Best for:** Teams wanting a smooth transition with minimal paradigm shift

#### Effort Comparison Summary

| Path | Estimated Effort | Risk Level | Long-term Maintenance |
|------|------------------|------------|----------------------|
| Chakra v3 | 15-25 days | High (incomplete docs, new patterns) | Medium (more rewrites possible) |
| Radix + Custom | 20-30 days | Medium (more upfront work) | Low (stable primitives) |
| shadcn/ui | 20-30 days | Medium (Tailwind adoption) | Low (you own the code) |
| Mantine | 15-20 days | Low (familiar patterns) | Low (stable API history) |

#### Key Consideration: Future-Proofing

Chakra UI has undergone two major rewrites (v1→v2, v2→v3) with breaking changes. If this pattern continues, choosing a more stable alternative could save significant effort in the long term.

**Mantine** has maintained better backwards compatibility between versions. **Radix** primitives are intentionally stable. **shadcn/ui** puts you in control of your own components.

---

### 3. Gradual Component Replacement

Use a different library for new features while keeping Chakra v2 for existing code.

**Pros:**
- Spreads effort over time
- Lower immediate risk

**Cons:**
- Two UI libraries in bundle (larger size)
- Inconsistent patterns across codebase
- Developers must know both libraries
- Eventually need to migrate old code anyway

**Recommendation:** Not recommended. The complexity cost outweighs the benefits.

---

### 4. Build Custom Components

Replace Chakra with custom-built components using plain React + CSS/SCSS.

**Pros:**
- Complete control
- No external dependencies
- No future migration concerns

**Cons:**
- Significant effort to build accessible components
- Must handle edge cases Chakra already solves
- Ongoing maintenance burden

**Effort estimate:** 40-60+ days

**Recommendation:** Not practical given the scope of CODAP's UI needs.

---

## Recommendations

1. **Schedule dedicated migration sprint** - This is not something to do incrementally
2. **Create comprehensive test coverage first** - Especially for modals and menus
3. **Study v3 thoroughly** - Watch the migration livestreams, read all docs
4. **Start with theme system** - Everything depends on it
5. **Use CLI tools** - `npx @chakra-ui/cli snippet add` generates useful component wrappers
6. **Plan for 3-4 weeks** - Including testing and bug fixes

---

## Resources

- [Official Migration Guide](https://chakra-ui.com/docs/get-started/migration)
- [LLM Migration Reference](https://chakra-ui.com/llms-v3-migration.txt)
- [Migration Discussion](https://github.com/chakra-ui/chakra-ui/discussions/9853)
- [Chakra v3 Announcement](https://chakra-ui.com/blog/announcing-v3)
- [Migration Experience Blog Post](https://codygo.com/blog/chakra-ui-v2-to-v3-easy-migration-guide/)
