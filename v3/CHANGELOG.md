# Changelog

## Version 3.0.0-beta.2664 - February 2, 2026

### ✨ Features & Improvements:
- **CODAP-171:** Users can import/drag a URL for a Google Sheet and get a dataset based on that sheet
- **CODAP-223:** Image dragged from browser into CODAP has appropriate size and responds to component resize
- **CODAP-760:** Notify users if CODAP is run on an unsupported browser
- **CODAP-1083:** Plugin API now supports bar chart scale configuration

### 🐞 Bug Fixes:
- **CODAP-138:** Preserve point fill colors when selected in dual y-axis graphs
- **CODAP-150:** Map component minimizes correctly with legend
- **CODAP-214:** Fix removal of subsequently added y-axis attributes
- **CODAP-257:** Fix undo tooltip when removing y-axis attribute
- **CODAP-273:** Fix box plot outlier tooltips and selection for duplicate values
- **CODAP-275:** Map layers are deleted automatically on deletion of a dataset
- **CODAP-304:** Fix Safari graph rendering issues when zoomed
- **CODAP-810:** Fix bar chart formula heights not rescaling when cases are hidden
- **CODAP-880:** Disable add case button in case card when filter formula is active
- **CODAP-969:** iPad local file save works in iOS 26
- **CODAP-1048:** Graph axis menus scrollable for long attribute lists
- **CODAP-1058:** LSRL confidence bands and standard error display fixed
- **CODAP-1072:** Long text elides with ellipsis in table cells
- **CODAP-1074:** Dropped images serialize correctly in saved documents
- **CODAP-1075:** Scatter plot LSRLs show one line for each category when split
- **CODAP-1077:** Image import works on macOS 26 Safari
- **CODAP-1078:** Fix hover tips not showing for bar charts and histograms
- **CODAP-1085:** Fix invalid precision values causing document load failures
- **CODAP-1087:** Plot background transparency toggle works
- **CODAP-1088:** Fix connecting line colors when there's a legend

### Asset Sizes
|      File |          Size | % Change from Previous Release |
|-----------|---------------|--------------------------------|
|  main.css |  210948 bytes |                          0.88% |
|  index.js | 7065472 bytes |                          1.06% |

## Version 3.0.0-beta.2614 - January 6, 2026

### ✨ Features & Improvements:
- **CODAP-219:** Case table collection header indicates number of non-empty and hidden cases
- **CODAP-1032:** Support `hideSplashScreen` URL parameter

### 🐞 Bug Fixes:
- **CODAP-188:** Slider thumb in Safari leaves gunk behind when dragging the thumb from right to left
- **CODAP-1054:** Fix: Google drive authentication dialog appears behind splash screen
- **CODAP-1062:** When attribute values are re-randomized, plugins should receive notification

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |  209112 bytes |                           <0.01% |
|  index.js | 6991303 bytes |                           <0.01% |

## Version 3.0.0-beta.2607 - December 24, 2025

### ✨ Features & Improvements:
- **CODAP-161:** Attributes can be of type **qualitative** and display as an orange bar in the case table
- **CODAP-196:** CaseCard: Enter key should edit next/previous cell
- **CODAP-271:** Label improvements for measures of spread
- **CODAP-730:** Formula editor should enclose attribute names that begin with digits in back ticks
- **CODAP-798:** Show Sonify plugin in default Plugins menu
- **CODAP-1019:** Sharing dialog: Update "Interactive API" tab label to "Activity Player"
- **CODAP-1022:** Support `di-override` and `di-override-url` parameters
- **CODAP-1028:** Support `standalone` url parameter
- **CODAP-1040:** Change the display of the standard deviation on graphs to have greater transparency
- **CODAP-1042:** The CODAP plugin API responds to "rerandomize" when the resource is a dataContext
- **CODAP-1034:** Support `hideWebViewLoading` url parameter
- **CODAP-1044:** Changes made by plugins should dirty the document

### 🐞 Bug Fixes:
- **CODAP-186:** Dragging points in split numeric plots computes wrong screen and world values
- **CODAP-195:** Case Card: disable editing for non-editable values
- **CODAP-286:** Fix categorical axis label truncation
- **CODAP-866:** Don't show hidden tiles in Tiles menu
- **CODAP-899:** Box plot median is hidden when equal to Q1
- **CODAP-913:** Fix bloated file size with redundant string values
- **CODAP-981:** Case table should scroll to selected case (if any) on restoring document
- **CODAP-987:** Histogram hover tips are using appropriate precision for bin boundary values
- **CODAP-992:** Problems choosing binned dot plot bin alignment and in assigning values to bins
- **CODAP-997:** Date slider layout problem
- **CODAP-1004:** Dot Plot: Null hover tips for date-time attribute
- **CODAP-1005:** Enhance slider inspector to handle dates
- **CODAP-1006:** Formula Editor: Escape key should close function/value popups without closing editor
- **CODAP-1010:** Graph should respond immediately to change in background color
- **CODAP-1016:** Numeric axis numbers disappear as cases are added
- **CODAP-1017:** Fix Importer plugin behavior
- **CODAP-1036:** Fix problem making graph in presence of 2 datasets
- **CODAP-1037:** Fix evaluation of formulas with ternary operator and symbol replacements
- **CODAP-1047:** A gaussian fit normal curve is not being drawn when it should
- **CODAP-1052:** Graph numeric axis does not show all desired number labels

### 🛠️ Under the Hood:
- **CODAP-1011:** Added "interactiveApi" resource to data interactive api

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |  209063 bytes |                           <0.01% |
|  index.js | 6987996 bytes |                           <0.01% |

## Version 3.0.0-beta.2568 - November 17, 2025

### ✨ Features & Improvements:

### 🐞 Bug Fixes:
- **CODAP-990:** Map doesn't recognize second boundary attribute
- **CODAP-994:** Fix logical operator (`&`, `|`) canonicalization in formulas
- **CODAP-998:** Formulas driven by sliders don't always update when slider value changes
- **CODAP-1002:** Escape key should dismiss autocomplete menu without dismissing formula editor
- **CODAP-1003:** Fix date-time slider round-trip through v2 export/import

### 🛠️ Under the Hood:
- **CODAP-367:** Serialized documents contain version of app that saved (not created) them

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |  208955 bytes |                            0.00% |
|  index.js | 6965390 bytes |                           <0.01% |

## Version 3.0.0-beta.2561 - November 7, 2025

### ✨ Features & Improvements:
- **CODAP-989:** Beta banner for public beta release

### 🐞 Bug Fixes:
- **CODAP-117**: The default case table column width does not match that of V2
- **CODAP-937:** Can't color boundaries and points at the same time in map
- **CODAP-959:** Numeric legend color assignment not preserved from V2 to V3
- **CODAP-960:** Case card from V2 document doesn't retain its narrow width
- **CODAP-967:** Binned dot plot doesn't display correctly when alignment is changed
- **CODAP-986:** Map doesn't recognize attributes of type "boundary" without special name
- **CODAP-988:** lookupBoundary() function fails if key arg requires evaluation

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |  208955 bytes |                           <0.01% |
|  index.js | 6959230 bytes |                           <0.01% |

## Version 3.0.0-beta.2551 - October 31, 2025

### ✨ Features & Improvements:
- **CODAP-54:** Counts and percents in graphs respond correctly to Show Measures for Selection
- **CODAP-84:** Implement import URL from hamburger menu functionality
- **CODAP-642:** Implement remaining semi-aggregate functions: percentile, rollingMean
- **CODAP-890:** You can drop a geojson into the document to import GIS data
- **CODAP-907:** Maps respond to the "Open in Draw Tool" menu item under the Image icon to open a draw tool plugin with the map image
- **CODAP-908:** Maps can be exported as 'png' images
- **CODAP-921** Show formula in tooltip on attribute hover
- **CODAP-922:** Clicking on tile drag areas, whether to resize or not, should select the tile
- **CODAP-925:** Document scrolls to include selected component
- **CODAP-936:** Ability to lock legend color bins
- **CODAP-964:** Log open document events to Google analytics
- **CODAP-970:** Support all import methods
- **CODAP-979:** The File menu item "Import Data…" should instead be "Import…"

### 🐞 Bug Fixes:
- **CODAP-107:** fix: case table rendering when dragging points in graph
- **CODAP-110:** Microdata portal is not displaying the state boundaries properly
- **CODAP-211:** Fix ICI not appearing
- **CODAP-303:** Saving locally on iPad creates file with '.txt' suffix
- **CODAP-685:** Graph: hover label of a node/dot gets cut off by the edge of screen/app
- **CODAP-777:** Case Card attribute drag preview lags behind mouse
- **CODAP-800:** Measures for Selection overlays (covers up) Parent Visibility Toggles when both are shown
- **CODAP-867:** Connecting lines not respecting top level category attribute
- **CODAP-900:** Story Builder transition between moments that have a dataset generates MST errors
- **CODAP-912:** Map boundaries not being painted correctly when map has legend
- **CODAP-918:** Connecting line draws outside plot bounds
- **CODAP-924:** Problem using "More" button in color picker — Set Color can act like Cancel
- **CODAP-926:** Graph resize handle doesn't work when it overlaps x-axis attribute name
- **CODAP-928:** Table horizontal scroll position is saved and restored
- **CODAP-932:** Should not allow "Fuse into Bars" when binned plot is split by categorical
- **CODAP-935:** Histogram doesn't update when bar width is changed
- **CODAP-940:** Hover tip for attribute names in case table gets cut off when it's long
- **CODAP-943:** Plugin title is not being saved and restored
- **CODAP-944:** Filtered cases are not exported in the v2 format
- **CODAP-945:** Filter formulas are not round tripped through the v2 format
- **CODAP-947:** Fix v2 import/export of computed bar chart
- **CODAP-951:** Dot chart not taking full advantage of bin width
- **CODAP-954:** Map grid is not restored
- **CODAP-955:** An attribute typed as numeric displays large numbers with comma separation
- **CODAP-956:** Cannot get Systolic blood pressure data in NHANES plugin
- **CODAP-957:** The map image that appears in the Draw Tool when user selects "Open in Draw Tool" is not complete
- **CODAP-958:** Document opens with an error dialog box showing
- **CODAP-963:** Simmer plugin showing case table not working
- **CODAP-966:** Fields for bin width and alignment don't accommodate numbers well
- **CODAP-980:** CountAdornmentComponent warning on opening Mammals example document

### 🛠️ Under the Hood:
- **CODAP-900:** Use full document applySnapshot in di doc update

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |  208567 bytes |                           <0.01% |
|  index.js | 6957067 bytes |                            0.01% |

## Version 3.0.0-beta.2503 - October 3, 2025

### ✨ Features & Improvements:
- **CODAP-232:** Users can add a background image to graphs
- **CODAP-809:** Redesigned text inspector
- **CODAP-822:** Guide button functionality
- **CODAP-894:** Tiles menu item hover brings component forward
- **CODAP-902:** Open graph image in Draw Tool plugin
- **CODAP-923:** Plugin API should support updating the position and dimensions of a component
- **CODAP-949:** New plugin api for fusing dots into rectangles

### 🐞 Bug Fixes:
- **CODAP-778:** Clicking attribute menu should not trigger drag of attribute
- **CODAP-840:** Disable dragging icons from the CFM toolbar
- **CODAP-884:** Dot plot crash on setting point size to zero
- **CODAP-914:** Don't show html formatting in hover tips
- **CODAP-915:** Fix crash on marquee select in maps
- **CODAP-920:** Fix subtraction of dates
- **CODAP-927:** Fix date string concatenation
- **CODAP-931:** Boolean evaluation in if() function and ternary operator is broken
- **CODAP-941:** V2 doc won't open in V3 (group key import bug)

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |  207849 bytes |                            0.01% |
|  index.js | 6902791 bytes |                            0.01% |

## Version 3.0.0-beta.2485 - September 16, 2025

### ✨ Features & Improvements:
- **CODAP-43:** Progress towards StoryBuilder working
- **CODAP-120:** The plugin API supports `get` for the formula engine
- **CODAP-764:** Vertical toolbar option
- **CODAP-776:** Case card is "responsive" to changes in component width
- **CODAP-835:** Implement keyboard shortcuts for undo & redo
- **CODAP-846:** Tile inspector palettes align with top of the tile
- **CODAP-857:** Update `<meta>` `description` content
- **CODAP-859:** New Table from Clipboard
- **CODAP-877:** Implement "Move Data Entry Row Here" menu item on case table index menu
- **CODAP-879:** Dynamic Toolbar Position Menu Item

### 🐞 Bug Fixes:
- **CODAP-96:** Formula editor closes unexpectedly when clicking outside the modal
- **CODAP-100:** Problems with adornment labels and hover tips
- **CODAP-302:** Difficulty dragging attributes from graph on iPad
- **CODAP-610:** Bar chart with computed bar heights isn't importing from V2 properly
- **CODAP-779:** Graph tip gets offset from mouse pointer when document has scrolled
- **CODAP-819:** Plugins should not show URL inspector
- **CODAP-823:** Fix formula editor button styling
- **CODAP-832:** Incorrect import/export of V2 date axis
- **CODAP-836:** Graph rescale works when data values are edited
- **CODAP-837:** Splitting a histogram should result in binned dot plot
- **CODAP-839:** Fix parent visibility toggles for case plot
- **CODAP-843:** Minimize and close buttons in component title bar should respond on click, not pointerDown
- **CODAP-844:** Minimize and close buttons should notify plugins
- **CODAP-845:** Nearly flat least squares lines slope display as 0
- **CODAP-850:** Editing text in a text component should notify plugins
- **CODAP-851:** Minimization state of components not restored in Story Builder moments
- **CODAP-853:** Story Builder moment title not synching with associated text component title
- **CODAP-855:** Formula evaluation with empty strings is broken
- **CODAP-858:** Minimized background component made active on attribute drop
- **CODAP-860:** Shared view "Copy" button styling
- **CODAP-862:** Fix for movable line causing invalid document
- **CODAP-863:** Movable line misbehaviors
- **CODAP-865:** "Group into bins" is not undoable
- **CODAP-868:** Connecting lines don't appear in each subplot
- **CODAP-870:** Leaving URL blank in "Web Page" component crashes
- **CODAP-873:** Long component title overflow
- **CODAP-874:** LSRL isn't updating during drag of points
- **CODAP-885:** Fix LSRL with 0 values
- **CODAP-889:** Error importing v2 document with date precision
- **CODAP-893:** Marquee select in graphs doesn't always clear selection at start
- **CODAP-896:** Measure label unit formatting
- **CODAP-898:** Box plot placement not correct when graph is split on both top and right

### 🛠️ Under the Hood:
- **CODAP-57:** Make tile `transitionComplete` a volatile property

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |  205514 bytes |                            0.02% |
|  index.js | 6863832 bytes |                            0.01% |

## Version 3.0.0-beta.2433 - August 15, 2025

### ✨ Features & Improvements:
- **CODAP-788:** Hierarchical plugins menu
- **CODAP-798:** Support creating/updating plotted values via plugin API
- **CODAP-816:** Use v2 document background
- **CODAP-830:** Refresh tile UI

### 🐞 Bug Fixes:
- **CODAP-363:** Fix case names for collapsed cases in case table
- **CODAP-824:** Fix expand/collapse behavior in hierarchical case table
- **CODAP-826:** Fix rescale button for two numeric axes
- **CODAP-828:** Fix render warning in case table
- **CODAP-829:** Fix rescale button for histogram
- **CODAP-831:** Fix histogram crash on rescale after flipping axes
- **CODAP-833:** Fix swapping of attributes on graph axes in some situations

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |  201786 bytes |                           -0.01% |
|  index.js | 6813473 bytes |                           <0.01% |

## Version 3.0.0-beta.2418 - July 31, 2025

### ✨ Features & Improvements:
- **CODAP-37:** Disable auto-save after converting v2 document
- **CODAP-46:** Show dialog to user when an unhandled error happens
- **CODAP-81:** The user has a chance to save dirty document when closing browser window/tab
- **CODAP-83:** Attribute menu **Recover Deleted Formula**
- **CODAP-118:** Update case table fonts
- **CODAP-318:** V2 import/export for plugins
- **CODAP-768:** Case Card: Card swipe animation
- **CODAP-790:** Graph: New points appear in final position
- **CODAP-797:** Beta Feedback button for bug reports
- **CODAP-801:** Move Settings and Help buttons from tool shelf to CFM toolbar
- **CODAP-803:** Inspector panel restyle
- **CODAP-807:** Enable CC logging and Google analytics
- **CODAP-813:** Beta release should default to v2 save format
- **CODAP-814:** Update tile minimize and close buttons
- **CODAP-815:** Update text toolbar colors to match spec

### 🐞 Bug Fixes:
- **CODAP-101:** Import data set metadata
- **CODAP-694:** Position new tiles within viewport
- **CODAP-774:** Case card opens behind other components
- **CODAP-775:** Attribute drags sometimes "stolen" by overlapped tiles
- **CODAP-792:** The rescale button does nothing when the plot is a bar chart
- **CODAP-817:** Fix styling and closing issues with CFM menus
- **CODAP-818:** Misalignment of relation lines in hierarchical case table

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |  202820 bytes |                            0.03% |
|  index.js | 6796028 bytes |                           <0.01% |

## Version 3.0.0-pre.2385 - July 21, 2025

### ✨ Features & Improvements:
- **CODAP-767:** Case Card: Modify paging to match v2 behavior

### 🐞 Bug Fixes:
- **CODAP-691:** Graph: Fix plotted function rendering on Firefox
- **CODAP-786:** Graph: Second drag of category on axis fails
- **CODAP-793:** Fix loading of Getting Started with CODAP 2 example document
- **CODAP-794:** Formulas: Fix data set and attribute lookup in `wordListMatches()` function
- **CODAP-795:** Fix compatibility of case id assignment with recent v3 builds

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |  196073 bytes |                            0.00% |
|  index.js | 6762381 bytes |                            0.00% |

## Version 3.0.0-pre.2364 - July 16, 2025

### ✨ Features & Improvements:
- **CODAP-103:** Case Table Ruler - Import Case Data from Clipboard…
- **CODAP-104:** Case Table Ruler - Export Case Data…
- **CODAP-287:** Case Table Ruler - Copy to Clipboard
- **CODAP-696:** Graph: "Export SVG Image"
- **CODAP-747:** Support Markov data game plugin
- **CODAP-753:** Update Sampler plugin url to latest version

### 🐞 Bug Fixes:
- **CODAP-98:** Graph attribute menu not showing attribute list when there is more than one dataset
- **CODAP-105:** Undo/redo not working for dragging categories on a categorical axis
- **CODAP-109:** Changing the type of an attribute to *numeric* should display the values as ordinary numbers
- **CODAP-280:** Graph attribute selection menus are empty when two or more tables exist in a document
- **CODAP-503:** Graph attribute menu clipping problem
- **CODAP-620:** Not equal to character (≠) should terminate identifiers in formulas
- **CODAP-621:** Formula engine is not parsing/evaluating the modulo operator % correctly
- **CODAP-630:** Improve performance of large .csv imports
- **CODAP-640:** Axis attribute menu for right y axis should be on top on inspect panel when opened
- **CODAP-643:** Default DataSet title should match v2
- **CODAP-645:** Enable Undo/Redo Support for Table Row Resizing
- **CODAP-681:** Graph: sometimes the axis labels are so long in a graph that the graph itself cannot be displayed
- **CODAP-682:** Graph renders incorrectly after setting aside cases
- **CODAP-686:** Graph renders incorrectly after Group into Bins
- **CODAP-688:** Table: double-clicking a cell to edit and vertical autoscroll conflict
- **CODAP-689:** Box plots display incorrectly after changing x axis attribute
- **CODAP-693:** Difficulty interacting with case table horizontal scroll bar
- **CODAP-697:** Chromebook performance -- performance tweaks to reduce re-renders, etc.
- **CODAP-698:** Graph renders incorrectly after hiding cases
- **CODAP-701:** Rendering categorical axes can take a long time
- **CODAP-715:** MST warning on dragging last attribute of collection
- **CODAP-718:** Dragging hierarchical table with many cases is laggy (Chromebook)
- **CODAP-719:** Difficulty grabbing/dragging graph tile (Chromebook)
- **CODAP-723:** Case Card: attribute dragging behaves inconsistently
- **CODAP-724:** Case Card is broken for empty data sets
- **CODAP-725:** Plugin API evaluation of formulas should match V2
- **CODAP-735:** mean and median adornments not drawn correctly when negative
- **CODAP-737:** Graph axis label becomes inaccessible
- **CODAP-738:** Getting started with CODAP document: "Drag this data file" not working, checkbox not changing state
- **CODAP-739:** Getting started with CODAP 2 document: two tables are displayed, checkboxes not changing state
- **CODAP-741:** Graph: Axis label covers the axis scale labels
- **CODAP-742:** Graph adornments don't export to .png correctly
- **CODAP-752:** Tile border resize handles sometimes inaccessible on first appearance of tile
- **CODAP-754:** Treating an attribute as *numeric* should convert strings containing numbers to numeric values and plot them
- **CODAP-758:** Binned dot plot with categorical on right axis doesn't display properly
- **CODAP-765:** first() and last() don't recalculate upon sort
- **CODAP-769:** Dots disappear while dragging to reorder categories in graphs
- **CODAP-787:** Dropping file on user entry dialog results in document being imported twice

### 🛠️ Under the Hood:
- **CODAP-733:** Add test for connecting lines with Display Only Selected Cases
- **CODAP-743:** Add a check for common console error logs to the Cypress smoke test suite
- **CODAP-759:** update dependencies; set target/lib to ES2020
- **CODAP-771:** Sync recent DocumentModel changes from CLUE to CODAP

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |  196073 bytes |                           -0.03% |
|  index.js | 6759783 bytes |                            0.01% |

## Version 3.0.0-pre.2324 - June 6, 2025

### 🐞 Bug Fixes:
- **CODAP-631:** Performance problems with dataset that has many attributes
- **CODAP-680:** Numeric axis numbers overlap and become illegible
- **CODAP-702:** Using API, create of parent case returns caseID of child
- **CODAP-703:** The dataset created by Markov, when exported to V2 needs have DG.GameContext as its type
- **CODAP-720:** With categorical axes, the categories overlap the attribute label

### 🛠️ Under the Hood:
- **CODAP-700:** Expand graph automation coverage for recent regression areas
- **CODAP-728:** Fix MST warnings on graph axis change

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |  201387 bytes |                            0.04% |
|  index.js | 6704343 bytes |                           <0.00% |

## Version 3.0.0-pre.2316 - May 30, 2025

### ✨ Features & Improvements:
- **CODAP-111:** Hover over attribute label on graph or map brings up the attribute description (if any)
- **CODAP-712:** Add documentation on the formula system

### 🐞 Bug Fixes:
- **CODAP-99:** The attribute menu for a date axis should show "Treat as Categorical" rather than "Treat as Numeric"
- **CODAP-112:** Graph hover tip appears in graph that is behind the component where the mouse is
- **CODAP-364:** The graph point tooltips appear unnecessarily when the Moveable Point is moved on top of them
- **CODAP-658:** Caption attributes in maps and graphs should not end up being hidden attributes
- **CODAP-678:** Rescale not behaving properly when graph y-axis has more than one attribute
- **CODAP-679:** Graph y-axis not adjusting layout to accommodate large numbers
- **CODAP-704:** Create graph scatterplot through plugin API chooses unusable axis bounds

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |  193534 bytes |                           <0.00% |
|  index.js | 6704859 bytes |                           <0.00% |

## Version 3.0.0-pre.2304 - May 16, 2025

### ✨ Features & Improvements:
- **CODAP-335:** Raster Data Support in CODAP Map
- **CODAP-672:** Normalize Map pins longitude

### 🐞 Bug Fixes:
- **CODAP-22:** Mouse cursor misleading in **Filter Formulas**
- **CODAP-51:** It should not be allowed to display percentages based on categorical attributes on top and right
- **CODAP-136:** Normal curve doesn't respond dynamically to drag of points
- **CODAP-301:** Should not be able to drag points whose coordinates are computed with formula
- **CODAP-349:** Rearranging "OTHER" categorical plot type text breaks the graph axis
- **CODAP-670:** Box plot not responding properly to dragging poings
- **CODAP-676:** Synchronization of Selection Between Graph Legend and Table/Map

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |  193534 bytes |                            -3.9% |
|  index.js | 6702661 bytes |                            0.93% |

## Version 3.0.0-pre.2293 - May 9, 2025

### ✨ Features & Improvements:
- **CODAP-655:** Rescale axes on data change in API

### 🐞 Bug Fixes:
- **CODAP-71:** Connecting lines are not displaying multiple colors in graphs with multiple y axes
- **CODAP-97:** New points in case plots appear on top of each other at top left
- **CODAP-116:** Connecting lines in map and graph do not hide when points are hidden
- **CODAP-323:** Map polygons created for each child case instead of one per parent
- **CODAP-654:** Undo/Redo tool tips aren't showing/hiding connecting lines
- **CODAP-365:** Bar chart point compression when changing graph axis
- **CODAP-366:** Changing leftmost attribute while parent toggles are on crashes CODAP
- **CODAP-617:** Binned dot plot stacks of points should be even
- **CODAP-660:** Binning dot plot in fresh graph doesn't show all points

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |  201351 bytes |                            4.05% |
|  index.js | 6640922 bytes |                            0.05% |

## Version 3.0.0-pre.2278 - April 25, 2025

### ✨ Features & Improvements:
- **CODAP-63:** Color axes treated as categorical produce color swatch axes
- **CODAP-601:** A formula for a bar chart computes the heights of the bars
- **CODAP-609:** Support component-level notifications in API for CODAP v3

### 🐞 Bug Fixes:
- **CODAP-86:** The ruler menu for binned dot plots should only show **Count** and **Percent**
- **CODAP-322:** Unable to click/select polygon in map
- **CODAP-361:** Graph legend incorrect after hierarchy change in table

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |  193509 bytes |                            0.68% |
|  index.js | 6637585 bytes |                            0.22% |

## Version 3.0.0-pre.2269 - April 18, 2025

### ✨ Features & Improvements:
- **CODAP-321:** Finish DataContext v2 import/export
- **CODAP-355:** Translucent rectangle adornment on numeric graph components
- **CODAP-372:** Percentage bar charts with legend divide 100% bar for each category into sub-categories
- **CODAP-373:** A formula can be applied to a bar chart
- **CODAP-607:** Add primaryRole property to graph object returned by API

### 🐞 Bug Fixes:
- **CODAP-60:** Slider displays yesterday's date instead of current date in animation
- **CODAP-78:** Missing hover indicator on case table attributes
- **CODAP-79:** Unwanted highlight element at the bottom of a graph on attribute drag

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |  192190 bytes |                            0.29% |
|  index.js | 6622491 bytes |                            0.66% |

## Version 3.0.0-pre.2256 - April 4, 2025

### ✨ Features & Improvements:
- **CODAP-6:** Map Pins
- **CODAP-64:** DI Attribute ColorMap
- **CODAP-68:** Allow plugins to get information about specific adornments
- **CODAP-305:** Finish Graph/Map v2 import/export
- **CODAP-306:** Guide component imported/exported from/to v2 documents
- **CODAP-307:** Image component imported/exported from/to v2 documents
- **CODAP-319:** Case table v2 import/export
- **CODAP-320:** Finish component properties v2 import/export

### 🐞 Bug Fixes:
- **CODAP-14:** Categorical plot axis should be sorted

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |  191639 bytes |                            0.62% |
|  index.js | 6578782 bytes |                            1.01% |

## Version 3.0.0-pre.2233 - March 25, 2025

### 🐞 Bug Fixes:
- **CODAP-353:** Percent adornment is displaying all 100% in categorical axis plots
- **CODAP-348:** CODAP is not embedding in the Activity Player

## Version 3.0.0-pre.2233 - March 24, 2025

### ✨ Features & Improvements:
- **CODAP-326:** Symmetric case table relation lines
- **CODAP-9:** Heatmap on Maps

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |  190454 bytes |                           <0.00% |
|  index.js | 6512860 bytes |                           <0.00% |

### 🐞 Bug Fixes:
- **CODAP-342:** Switching to another plot type results in confusing error handling in the API Tester
- **CODAP-341:** Moving axis labels won't move the corresponding points in graphs

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |  190454 bytes |                           <0.00% |
|  index.js | 6514500 bytes |                            0.44% |

## Version 3.0.0-pre.2224 - March 21, 2025
### ✨ Features & Improvements:
- **CODAP-74:** Get adornment list for a particular graph
- **PT-188928484:** "url" url parameter supports csv import

### 🐞 Bug Fixes:
- **CODAP-337:** Some points in the graph become invisible after being manipulated for several times.

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |  190281 bytes |                           <0.00% |
|  index.js | 6485505 bytes |                            0.13% |

## Version 3.0.0-pre.2219 - March 14, 2025

### 🐞 Bug Fixes:
- **CODAP-31:** `di` url param should load plugin alongside `#example` document
- **CODAP-41:** Hidden levels cause issues in the table display.
- **CODAP-89:** Component reposition and resize in iPadOS
- **CODAP-329:** Unable to hide selected cases in graphs with multiple y-axes
- **CODAP-300:** Date values not showing on date-time slider
- **CODAP-123:** Bar chart selection misbehaves in Safari

### 🛠️ Under the Hood:
- **CODAP-130:** Automation - Missing data with 2nd categorical axes

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |  190281 bytes |                           <0.00% |
|  index.js | 6476957 bytes |                           <0.00% |

## Version 3.0.0-pre.2202 - March 7, 2025

### ✨ Features & Improvements:
- **CODAP-2:** Splash Screen when launching CODAPv3 in AP
- **CODAP-4:** Relationship (squiggly) lines for tables
- **CODAP-48:** When a date-time slider is restricted to multiples of some unit the value of the slider should be rounded accordingly

### 🐞 Bug Fixes:
- **PT-188914441:** Graph adornments are not rendering correctly in restored documents
- **PT-188932078:** Clicking on bar chart is not selecting cases
- **CODAP-53:** Circular ref error
- **CODAP-122:** Line plot not showing data tips and is missing zero line
- **CODAP-129:** Missing data with 2nd categorical axes
- **CODAP-132:** Switching from a line plot to a dot or bar chart results in dots/bars being rendered off-center

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |  190227 bytes |                            0.26% |
|  index.js | 6472331 bytes |                            0.15% |

## Version 3.0.0-pre.2190 - February 28, 2025

### ✨ Features & Improvements:
- **PT-188810519:** **first** and **last** functions
- **PT-188877776:** basic linear numeric color legend

### 🐞 Bug Fixes:
- **PT-188848789:** Bar chart is not rendering correctly in shared documents
- **PT-188819773:** Graph axes and scaling are incorrect when switching from a date attribute to another date attribute
- **PT-188919673:** Replacing date axis with categorical attribute doesn't work properly
- **PT-188914180:** Graph axis doesn't update when initial checkbox value changes

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |  189725 bytes |                            0.38% |
|  index.js | 6462717 bytes |                           <0.00% |

## Version 3.0.0-pre.2183 - February 20, 2025

### ✨ Features & Improvements:
- **PT-188694812:** Import/export transparency and strokeTransparency for maps

### 🐞 Bug Fixes:
- **PT-188868683:** Checkbox type attributes do not graph correctly
- **PT-188871479:** The api does not respect the width dimension when creating a caseTable
- **PT-188623886:** When trying to drag a minimized component, it doesn't move until mouseUp.
- **PT-188892243:** Attempt at arrow key navigation in case table causes crash
- **CODAP-12** Categorical Plots should retain 0 as a category

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |  189010 bytes |                           <0.00% |
|  index.js | 6460492 bytes |                           <0.00% |

## Version 3.0.0-pre.2174 - February 14, 2025

### ✨ Features & Improvements:
- **PT-188463252:** Support Checkbox Attribute Type in **Case Table** and **Case Card**
- **PT-188879551:** The plugin API supports **notify** for the formula engine

### 🐞 Bug Fixes:
- **PT-188781023:** Map boundary data does not display after creating a copy of the document
- **PT-188364145:** "Chosen" Column Displays True/False Instead of Checkboxes in CODAP v3 – StoryQ Plugin 2.16-v3-pre.3
- **PT-188883578:** Single-clicking a checkbox in the case table unintentionally selects the entire case
- **PT-188872446:** "index" text is missing in case index column
- **PT-188624240:** Cells are editable as soon as they are selected
- **PT-188809846:** Unwanted point in top left corner for categorical and categorical plots
- **PT-188883647:** Checkboxes should be included in the Undo/Redo stack
- **PT-188571681:** Single click of graph Inspector Panel has become finicky
- **PT-188872789:** Undo/redo issues with movable line

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |  189010 bytes |                            0.20% |
|  index.js | 6458550 bytes |                            0.20% |

## Version 3.0.0-pre.2157 - February 7, 2025

### 🐞 Bug Fixes:
- **PT-188820212:** Cannot select numeric keys in categorical legend.
- **PT-188213272:** Changing graph legend from numerical to categorical does not change legend type
- **PT-188601933:** Treat as Categorical causes points to move off plot
- **PT-188790569:** Delay on drag of component and drag of attribute from case table
- **PT-188514669:** Table often obscures other components, because it is becoming selected during attribute dragging action
- **PT-188862999:** Insert value neglects to include backticks.

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |  188541 bytes |                           <0.00% |
|  index.js | 6443247 bytes |                             0.1% |


## Version 3.0.0-pre.2144 - January 31, 2025

### ✨ Features & Improvements:
- **PT-181971417:** Display of **dates** in Case Card
- **PT-188575507:** Color functions produce colors
- **PT-187711050:** Adornments respond to Show Measures for Selection option
- **PT-188517456:** You can use the "modulo" operator ('%') in formulas
- **PT-188616847:** Export Graph in v2

### 🐞 Bug Fixes:
- **PT-188815937:** Cannot rearrange categories on a graph
- **PT-188688258:** Zero line is missing on bar charts
- **PT-188590675:** **Formula Editor** prev() and next () function produces invalid argument error in first cell
- **PT-188819856:** Graph axis is incorrect when switching from numerical to categorical plots
- **PT-188651787:** Attribute name fails to save in **case card** when clicking away
- **PT-188820316:** Categorical legend causes an error when new categories are added

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |  188526 bytes |                           <0.00% |
|  index.js | 6436222 bytes |                             0.5% |

## Version 3.0.0-pre.2128 - January 24, 2025

### ✨ Features & Improvements:
- **PT-188753758:** 3D Point/Case Select
- **PT-188616819:** Export Text component in v2 format
- **PT-181912260:** A categorical axis fits as many category labels as it can without overlap and then clumps the remaining categories into *OTHER*.
- **PT-181904766:** Graph title
- **PT-188794630:** Case selection is saved and restored
- **PT-188616850:** Export Map in v2 format

### 🐞 Bug Fixes:
- **PT-188784911:** get dataContext[] should match on user-set `title` as well as internal `name`
- **PT-188794430:** Vertical Movable Lines don't serialize
- **PT-188794755:** Crash on categorical/categorical plot graph resize
- **PT-188523118:** Cannot create multiple y axes in graph with date-time axis
- **PT-188804884:** Values entered in case table/card are not being trimmed.
- **PT-188801759:** Values and attribute names in an imported CSV should be trimmed
- **PT-188719090:** displayOnlySelectedCases shows all cases after a click away
- **PT-188773882:** Hyperlink text is formatted differently in v2 and v3
- **PT-188767656:** Insert cases modal has unwanted white space on the right
- **PT-188484850:** Date values are not automatically recognized as date-time attributes
- **PT-188492167:** Selection of numeric legend key is not showing that the range is selected

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |  188526 bytes |                           <0.00% |
|  index.js | 6406785 bytes |                             0.2% |


## Version 3.0.0-pre.2090 - January 10, 2025

### ✨ Features & Improvements:
- **PT-188616842:** Export Case Card and Case Table in v2 format.
- **PT-188565497:** Map respects filter formula
- **PT-188688712:** Allow attribute rename in formula editor
- **PT-188624629:** Input row does not have index menu
- **PT-187958658:** Make **input row** draggable
- **PT-188276475:** Case table and case card show **Filter Function** when one is present
- **PT-187953018:** New case table has edit focus in dataset name

### 🐞 Bug Fixes:
- **PT-186293627:** Datasets are getting duplicate names
- **PT-188590488:** Default display precision for **formulas** differs between CODAP V2/Plugins and CODAP V3
- **PT-188749138:** wordListMatches function doesn't auto update
- **PT-188623967:** Heading formatting in the text component doesn't work.

### 🛠️ Under the Hood:
- **PT-188651494:** Get Cypress to interact with PixiJS canvas

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |  188408 bytes |                             0.5% |
|  index.js | 6394076 bytes |                             0.4% |

## Version 3.0.0-pre.2076 - January 3, 2025

### ✨ Features & Improvements:
- **PT-188527686:** Formula Editor improvements
- **PT-187738928:** DI Create DataContextFromURL
- **PT-188712457:** Support async API handlers

### 🐞 Bug Fixes:
- **PT-188623852:** Selecting parent case using keyboard navigation does not cause child cases to scroll into view like they do when you click on a parent case to select it.

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |  187430 bytes |                             0.6% |
|  index.js | 6365219 bytes |                           <0.00% |

## Version 3.0.0-pre.2068 - December 23, 2024

### ✨ Features & Improvements:
- **PT-188673066:** Case card supports color value editing even when attribute is not typed as 'color'
- **PT-188616842:** Export Case Card and Case Table in v2 format.
- **PT-188616792:** Export WebView in v2 format.
- **PT-188616810:** Export GameView in v2 format
- **PT-188616852:** Export Slider in v2 format
- **PT-188651857:** A plugin can get and update any top level graph feature
- **PT-181846570:** Rows of the case table can be resized by clicking and dragging on the bottom of a row's index cell.

### 🐞 Bug Fixes:
- **PT-188590950:** Graph: crash on axis switch from categorical parent attribute to date child attribute
- **PT-188713991:** Hierarchical DataSets exported from v3 do not import into v2 correctly
- **PT-188719111:** Lookup functions should match user-set title

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |  186170 bytes |                            0.03% |
|  index.js | 6359249 bytes |                            0.01% |

## Version 3.0.0-pre.2058 - December 13, 2024

### ✨ Features & Improvements:
- **PT-188646708:** A plugin can update an existing graph's attribute assignment
- **PT-188614511:** Update v2 types to cover the majority of shared v2 documents (*Started*)
- **PT-188613419:** v2 export of DataSets => DataContexts (*Finished*)
- **PT-188616842:** Export Case Card and Case Table in v2 format. (*Started*)

### 🐞 Bug Fixes:
- **PT-188605717:** Bar chart with single bar fills whole graph (*Delivered*)

### 🛠️ Under the Hood:
- **PT-187950465:** Update to eslint v9 and the new flat config format

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |  185542 bytes |                           -0.01% |
|  index.js | 6347162 bytes |                           <0.00% |

## Version 3.0.0-pre.2046 - December 6, 2024

### ✨ Features & Improvements:
- **PT-188544375:** Use fixed-width font to display numeric attribute values in case table
- **PT-188589165:** Country Boundaries in v3 Case Table
- **PT-187958696:** Improve **input row** UI
- **PT-188514789:** Attribute color type in case card
- **PT-188618452:** New table clean up

### 🐞 Bug Fixes:
- **PT-188548516:** Undo of making parent collection causes errors visible in console
- **PT-188590901:** Graph: axis tick and gridlines issues with component resize
- **PT-188523090:** Graph numeric axis labels do not restore correctly on component resize
- **PT-188640918:** When points in dot plot are dragged, mean isn't updating
- **PT-188589248:** Plots not showing when split on top and/or right
- **PT-188617540:** Points in map should not animate in from top left
- **PT-188600172:** Opening a corrupted document should notify the user and not succeed
- **PT-188620026:** V2 Map Importer crashes with older documents
- **PT-188652082:** Documents with set-aside cases should import/restore correctly

### 🛠️ Under the Hood:
- **PT-188613413:** Initial infrastructure for v2 export
- **PT-188523684:** Shared document info should be stored in original document
- **PT-188383228:** Should preserve case ids when importing v2 documents

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |  185550 bytes |                            0.72% |
|  index.js | 6342330 bytes |                           -26.2% |

## Version 3.0.0-pre.2023 - November 22, 2024

### ✨ Features & Improvements:
- **PT-188491735:** Boundaries display in case table cells as small representations of the polygon
- **PT-187849414:** Auto-detect boundary data type
- **PT-188491712:** lookupBoundary function
- **PT-188104685:** Browser tab titles show document name
- **PT-188497370:** **Legend colors** can be changed in the layers (for maps) inspector menu

### 🐞 Bug Fixes:
- **PT-188570070:** Minimized components can't be unminimized after importing a v2 document into v3
- **PT-188364161:** Misalignment of **numerical attributes** in **case table**
- **PT-188392104:** **Formulas** don't behave for **case card** view
- **PT-188571448:** Nested Table View in MultiData plugin fails to update when adding new hierarchy levels in CODAP v3 case card view (*Delivered*)
- **PT-188571538:** Lat/long points will not display in Map component when migrating v2 documents to v3 (*Finished*)

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |  184216 bytes |                            0.16% |
|  index.js | 8592052 bytes |                           135.9% |


## Version 3.0.0-pre.2009 - November 15, 2024

### ✨ Features & Improvements:
- **PT-181910061:** **Legend colors** can be changed in the brush (for graphs) inspector menu
- **PT-181889643:** Attribute menu **Fit width to content**
- **PT-188497532:** Graph/map filter function use new formula editor
- **PT-188545557:** dropping a codap file onto a dirty document should ask for confirmation
- **PT-187014862:** When color attributes are used as legends points are colored accordingly (*Delivered*)
- **PT-188459268:** Remaining Bivariate Statistical Functions (*Delivered*)
- **PT-181869876:** The case *table* has a **"rescale"** icon that causes columns to resize (*Delivered*)
- **PT-188497528:** Case table/card filter function use new formula editor (*Delivered*)
- **PT-187967988:** Edit Attribute Properties dialog should support date-time precision for date types (*Delivered*)
- **PT-182991523:** User has control over display of numbers (*Delivered*)

### 🐞 Bug Fixes:
- **PT-188323297:** Autoscale Fails When Multiple Points Are Selected and Hidden from the Graph
- **PT-188539637:** Dragging dot plot points doesn't affect case table values if dataset is hierarchical
- **PT-188234640:** Attribute Menu Doesn't Dismiss When Resizing **Case Table** and **Case Card**
- **PT-188524711:** Case table doesn't display correct value on release of dragged point
- **PT-188514843:** Maps do not open at correct zoom level
- **PT-188539688:** Dot plot messed up response to adding parent collection
- **PT-188415967:** CODAP document name is not restoring on open
- **PT-188305544:** Hidden attributes show in graph attribute menu list
- **PT-188411147:** Unable to Dismiss **Rename Attribute** Dialog in **case table** after a single click away
- **PT-188524747:** Graph: Clicking on selected points deselects other points preventing multiple point drag (*Delivered*)
- **PT-188411287:** **Case Card with Hierarchy** becomes stuck in Tool-shelf in CODAP v3 (*Delivered*)
- **PT-188036951:** Inability to select/scroll to individual cases in child level of hierarchy (*Delivered*)
- **PT-188514748:** Point slide incorrect representation in hierarchical case table with crash (*Delivered*)

### 🛠️ Under the Hood:
- **PT-188402995:** Automation for Slider components with new date handling implemented
- **PT-188575672:** Run Cypress in a fixed version of Chrome on GitHub
- **PT-188554616:** Crash in usePixiPointerDown

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |  183913 bytes |                            0.41% |
|  index.js | 6321511 bytes |                            0.34% |

## Version 3.0.0-pre.1976 - November 6, 2024

### ✨ Features & Improvements:
- **PT-188182907:** Dirty document management
- **PT-181840421:** The hamburger menu item **Close** closes the current document
- **PT-188484902:** Formula Editor keyboard shortcuts
- **PT-187502179:** Case table Color picker shows palette of 16 + 1 color squares by default (*Started*)

### 🐞 Bug Fixes:
- **PT-188509712:** **Sorting** of hierarchical attribute should sort within parent cases
- **PT-188037024:** Missing "=" sign in Formula Editor dialog
- **PT-188403674:** Layout of graph axis not correct on restore
- **PT-188463149:** **Insert Function** selects incorrect portion of inserted text for editing on Safari (and sometimes other browsers)
- **PT-188524694:** Dragging dot plot point fails to cause other points to adjust their positions
- **PT-188470760:** “TAB” Button Does Not Trigger Autocomplete in **Formula Editor**
- **PT-187614572:** Dot chart and bar chart respond dynamically to change in category order (*Delivered*)
- **PT-188476241:** **[MultiData]** Hidden attributes are visible in MultiData Nested Table plugin (Delivered)


### 🛠️ Under the Hood:
- **PT-187223531:** The plugin api supports the ability to specify set aside cases

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |  183151 bytes |                            0.21% |
|  index.js | 6299639 bytes |                           <0.00% |

## Version 3.0.0-pre.1963 - November 1, 2024

### ✨ Features & Improvements:
- **PT-188459260:** Remaining Statistical Functions
- **PT-188497515:** Plotted value/function use new formula editor
- **PT-188356056:** The user can choose to display the squares of residuals from a plotted function (*Delivered*)
- **PT-183987088:** Graph brush palette allows categories to be assigned colors via scrollable list (*Delivered*)

### 🐞 Bug Fixes:
- **PT-187953007:** First click in graph/map empty space does not change selection
- **PT-188351110:** Hide cases is broken in map
- **PT-188497004:** **Sort** Behavior for Parent Cases Differs Between CODAP v3 and CODAP v2
- **PT-188460088:** Dot chart not respecting number of cases when attribute is not at childmost level (*Delivered*)
- **PT-187364079:** Attribute formula based on slider doesn't save/restore
- **PT-188428974:** Cancel does not revert **formula** back to previous state
- **PT-188502341:** Dot chart not responding correctly to change in hierarchy if it has a legend.
- **PT-188484892:** Formula editor doesn't recognize pre-existing parentheses (*Delivered*)

### 🛠️ Under the Hood:
- **PT-188412560:** Develop targeted cypress smoke test

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |  182767 bytes |                            1.64% |
|  index.js | 6294019 bytes |                           <0.00% |


## Version 3.0.0-pre.1946 - October 25, 2024

### ✨ Features & Improvements:
- **PT-182079220:** The formula editor has full documentation for functions as in V2
- **PT-188415994:** CODAP v3 Documents in the **Activity Player** shouldn't show the file menu
- **PT-186945894:** Support language-switching via CFM language menu
- **PT-188416015:** Remaining Logical/Other **Functions**
- **PT-188286105:** Drag objects from Plugins to CODAP tables or graphs

### 🐞 Bug Fixes:
- **PT-188104342:** Grid does not display in Four Seals
- **PT-188382528:** **Formulas** Don’t Highlight Across Table Row

### 🛠️ Under the Hood:
- **PT-187738926:** DI Update DataContext Sort (*Delivered*)
- **PT-188363563:** Add plugin API for plugins to request that CODAP bring up formula editor for a particular attribute (*Finished*)
- **PT-188410313:** Add Slack Notification about failed tests on `main`

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |  179807 bytes |                            2.93% |
|  index.js | 6289897 bytes |                            2.58% |

## Version 3.0.0-pre.1934 - October 18, 2024

### ✨ Features & Improvements:
- **PT-187799311:** The inspector panel for graphs shows a **filter** icon
- **PT-182079193:** Users can enter formulas for attributes via a formula editor like v2's
- **PT-181890013:** Attribute menu **Sort Ascending (A->Z, 0->9)** or **Descending**
- **PT-182849961:** Case table supports advanced selection
- **PT-187799278:** A slider can be configured to display date-time values (*Finished*)

### 🐞 Bug Fixes:
- **PT-188428955:** Attributes lose color on modal re-open

### 🛠️ Under the Hood:
- **PT-188363964:** Codap to Plugin Drag and Drop (*Finished*)

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |  174686 bytes |                            0.21% |
|  index.js | 6131530 bytes |                            0.34% |

## Version 3.0.0-pre.1926 - October 11, 2024

### ✨ Features & Improvements:
- **PT-186182704:** In case table columns whose values are computed with a formula have a yellow background
- **PT-188274615:** Develop lezer grammar for CODAP formulas for use with CodeMirror
- **PT-187951404:** Case table attribute name cell displays on two lines if required and makes "smart" word break choices
- **PT-188392010:** Graph/map filter formula changes should be undoable

### 🐞 Bug Fixes:
- **PT-187323603:** WebView iframes interrupt dragging tiles
- **PT-188236957:** Crash when deleting a dataset used by a graph
- **PT-188376356:** Undoing a create case action should also deselect the case
- **PT-188382390:** Four Seals example document is empty

### 🛠️ Under the Hood:
- **PT-188397633:** Implement `run regression` label to reduce Cypress test results
- **PT-188402115:** Speed up GitHub build

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |  174315 bytes |                            1.05% |
|  index.js | 6110789 bytes |                            7.71% |

## Version 3.0.0-pre.1907 - September 30, 2024

### ✨ Features & Improvements:
- **PT-184432150:** Case Table Ruler - Rerandomize All
- **PT-181841034:** The **Help** icon allows the user to access help and other information about the project
- **PT-188235437:** CODAP logs user actions to Google Analytics
- **PT-181840383:** The menu bar has a language menu
- **PT-186945890:** Show language menu in CFM bar
- **PT-188276295:** Click in case table "white space" below the table deselects all cases for that dataset
- **PT-187573192:** Attribute labels on graphs and maps display units
- **PT-188274494:** Formulas should work with `≠`, `≤`, `≥` as well as their two-character counterparts
- **PT-188333647:** The **case card** has an inspector menu
- **PT-187799307:** The inspector panel for case tables and case cards shows a **Set Aside Filter Function** choice
- **PT-185628921:** Dots sometimes go beyond the boundaries of the subplots that contain them
- **PT-188243268:** Setup Deployment for StoryQ
- **PT-187738941:** DI Finish SelectionList Requests
- **PT-187738977:** DI Notify LogMessage Requests
- **PT-187738922:** DI Notify DataContext

### 🐞 Bug Fixes:
- **PT-184879587:** Need to restrict all tile/components from being dragged beyond the top border
- **PT-187774818:** Components are slow to reload when resizing
- **PT-188300239:** Fix fresh shared tables
- **PT-188279613:** Fix sharing existing table
- **PT-188300061:** Undo of add numeric attribute to axis is broken
- **PT-188234714:** Parent visibility toggles not working
- **PT-188293477:** When hiding cases, numeric axes should not rescale
- **PT-188305480:** Crash on undo of drag attribute to graph
- **PT-188286129:** Web view inspector menu is missing its icon
- **PT-188286148:** The user should be able to enter a web view url that is missing "https://"
- **PT-188312576:** Date axis not working properly
- **PT-188270437:** Impossible to edit title of graph component with no title
- **PT-188286576:** Selected attributes are not dragging upward
- **PT-188326911:** Fix Importing Datasets
- **PT-188319487:** Crash on closing text component in Four Seals
- **PT-188275873:** Cannot drag any attribute from case card view to the vertical axis, resulting in incorrect graph creation
- **PT-188333898:** Graph points stuck in the top-left corner

### 🛠️ Under the Hood:
- **PT-187950454:** Update pixi.js to v8 (latest version)
- **PT-186784013:** PixiJS graph: periodically dispose unused textures
- **PT-187972789:** Automate Redo Functionality for Case Card in Table View
- **PT-187833691:** Enable Automation Test for Undo/Redo Functionality in Graph with Numeric x-axis and Two Numeric y-Attributes

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |  172492 bytes |                            0.80% |
|  index.js | 5673100 bytes |                            -4.0% |


## Version 3.0.0-pre.1869 - September 13, 2024

### ✨ Features & Improvements:
- **PT-188001758:** Multidata Styling on CODAPv3 Card Data Graph Interaction
- **PT-188001450:** Multidata  CODAPv3 Card Data Reorganization within level
- **PT-188212617:** Multidata  CODAPv3 Card Data Reorganization create hierarchy level
- **PT-188173137:** Representation of dataset in case card is hierarchical
- **PT-188199941:** Hierarchical case table -- Parent child grouping areas show selection color when all child cases are selected
- **PT-181869565:** Case card has 'plus' icon for making new attributes
- **PT-188173206:** Clicking on attributes in case card brings up attribute menu
- **PT-188173211:** Dragging case card attributes
- **PT-181869693:** Editing existing values in a case card is initiated with a single-click
- **PT-181869597:** Case card has an **add case** icon at right of each collection header
- **PT-188003195:** Case ids should be persistent across case-wide value changes
- **PT-188173216:** Dropping attributes in case card
- **PT-187381671:** Click in case table "white space" deselects all cases for that dataset
- **PT-188003381:** Set Aside **filter** on Tables
- **PT-187372247:** DI create/get/update selectionList featuring collections

### 🐞 Bug Fixes:
- **PT-188109429:** Horizontal date axis partly empty when split on top
- **PT-188219800:** Bar for each point problem with dates
- **PT-188221613:** A Count axis should only show integer values
- **PT-188228770:** On opening document categorical axis on y-axis is too narrow
- **PT-188227145:** Excessive categorical axis repainting
- **PT-188200067:** **Bar Chart** Compresses to Top When Hiding Unselected Cases in Mammals Dataset
- **PT-188214433:** Rename Attributes in Collaborative
- **PT-188045800:** Modal dialog box follows the mouse when selecting text in input area or choosing Precision in Attribute Properties (Safari)
- **PT-188252932:** Bug: dragging attribute before itself moves it to end
- **PT-188245707:** Cases hidden in graph become visible on restore
- **PT-188254368:** Dot chart not restoring properly with hidden cases
- **PT-188200175:** Cards extend below bottom of **card view** container rather than being scrollable within the container
- **PT-188254408:** Duplicate Cases after restore setAside
- **PT-188104418:** Tile names do not update in the **tiles menu** after renaming components
- **PT-188263826:** SetAside + Adding Cases Bug
- **PT-188104356:** Maintain Editing Status When Shared Table Changes
- **PT-188103938:** Unable to advance to blank cells using "enter" key in Collaborative Sharing plugin

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |  171157 bytes |                            0.00% |
|  index.js | 5879153 bytes |                            0.20% |

## Version 3.0.0-pre.1831 - August 30, 2024

### ✨ Features & Improvements:
- **PT-188104615:** Support less-restrictive date validation
- **PT-188136819:** Relational operators support strings, dates
- **PT-188136625:** Dates without hours/minutes should not display hours/minutes by default
- **PT-181971361:** **Date axes** are similar to numeric axes, but different
- **PT-181840552:** The hamburger menu item **Share…** functions as in V2
- **PT-181840559:** The hamburger menu item **Rename…** opens dialog box for renaming document
- **PT-188188119:** Support `url` url parameter
- **PT-188131728:** There is a url parameter **di** that will load a data interactive plugin
- **PT-188115683:** Remove Empty Row in Shared Table when Adding Data
- **PT-187178550:** Optimize data synchronization for collaborative tables in high-volume scenarios
- **PT-188117294:** Plugins menu contents should be in CODAP source rather than retrieved remotely
- **PT-188124952:** Support morePlugins url parameter
- **PT-188140449:** Add Data Interactive API Tester to plugins menus when DEBUG_PLUGINS is set
- **PT-188140448:** Plugin API should support text component

### 🐞 Bug Fixes:
- **PT-187798725:** Graph turns into scatterplot when creating new collections in Mammals dataset
- **PT-188130687:** MST warnings in Four Seals with date axis
- **PT-188118418:** Story Builder Plugin Should Not Be Closable
- **PT-188125035:** Fix selectCasesNotifications
- **PT-188102629:** today()+24*3600 yields a number, not a date
- **PT-188117637:** Undo of graph response to moving attribute from child to parent collection not working
- **PT-188136564:** Formula `today()` should not be affected by time zone
- **PT-188139181:** Insert Case via Index Column in Hierarchical Table
- **PT-188166140:** Formula compilation adds extraneous actions to undo history
- **PT-188103062:** Bullets and numbered lists don't work in the **Text** component
- **PT-188056675:** Collaborative: Multiple Users
- **PT-188104620:** Share document sometimes fails to show share url
- **PT-187936148:** Inspector menu palette left margin consistency
- **PT-188144634:** Bar charts are broken
- **PT-188109309:** Graph doesn't respond dynamically to change in extent of date axis
- **PT-188188327:** Date axis not restored properly
- **PT-188104017:** Tab In Input Row Adds Two Items
- **PT-188104291:** Return Table to Normal after Sharing
- **PT-188109499:** Date axis grid lines missing for scatterplot

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |  171274 bytes |                           -0.07% |
|  index.js | 5879153 bytes |                            7.67% |

## Version 3.0.0-pre.1782 - August 12, 2024

### ✨ Features & Improvements:
- **PT-181846581:** Case table rows of multiple children can be collapsed
- **PT-181846596:** Each collection in a case table has its own header where its name and number of cases are shown
- **PT-181840926:** The **Text** icon causes a new text component to appear.
- **PT-188095789:** Auto-focus newly created text component
- **PT-181889964:** Attribute menu **Delete Formula (Keeping Values)**
- **PT-188009741:** DI Collection Labels
- **PT-187738952:** DI Get Component Requests
- **PT-182089941:** CODAP logs user actions to the CC log server
- **PT-188095695:** Formulas are not getting evaluated on restore

### 🐞 Bug Fixes:
- **PT-187833677:** Crash on undo of adding multiple-y attribute to graph
- **PT-187452500:** Drop target highlights show on top of other tiles during attribute drags
- **PT-187949371:** Bug: Case table can auto-scroll vertically on attribute drag
- **PT-188045173:** Input Row doesn't work in Collaborative plugin
- **PT-188050066:** Collaborative: Sharing Existing Tables
- **PT-188066180:** "Failure to fetch" plugin info with network issues

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |  179710 bytes |                            2.33% |
|  index.js | 5932034 bytes |                            0.90% |

## Version 3.0.0-pre.1762 - July 24, 2024

### ✨ Features & Improvements:
- **PT-181846592:** Each table in a case table has its own **input row**
- **PT-187967544:** Case table: enter key should advance to next row
- **PT-187810613:** The user can create a new attribute using a command in the case table's **ruler** menu
- **PT-187881303:** An ICI url parameter allows the user to display an "informal confidence interval" on a box plot.
- **PT-181909481:** Selection of points in graphs and maps
- **PT-187799270:** There is a full set of date-time functions
- **PT-187965959:** **DateTime** Date Support in Case Table
- **PT-188007822:** Add `number` formula to CODAP v3, support dates
- **PT-187932225:** Drag and drop modals
- **PT-187950451:** Update to mathjs 12.4.3 (or latest v12 version)
- **PT-187797451:** DI Get and Update InteractiveFrame Requests
- **PT-187737794:** DI Notify ItemSearch ItemOrder
- **PT-187994058:** DI create/update component caseTable horizontalScrollOffset
- **PT-187738935:** DI Get CaseFormulaSearch
- **PT-187985989:** DI Update interactiveFrame preventTopLevelReorg
- **PT-187792879:** Plugin component shows version number in titlebar

### 🐞 Bug Fixes:
- **PT-187931119:** Changed parent case values are not immediately displayed in tables
- **PT-187931309:** Creating a new collection does not result in a reorder of the child collection
- **PT-187931070:** Table doesn't update immediately in response to notify itemSearch itemOrder API requests
- **PT-187948687:** MST warning on undo create case table
- **PT-187949749:** Redo of component creation results in invisible components
- **PT-187951353:** In case table, `useRows.handleRowsChange` is called twice after editing cell and pressing enter
- **PT-184879695:** Initial click on case table row isn't selecting the case unless the case table already has focus
- **PT-187735631:** Missing connecting lines in case table after hiding last attribute in collection
- **PT-187808979:** The dialog box for entering a URL for a web page should be very close in appearance to that of V2
- **PT-187127871:** Undo fails to restore deleted cases after insertion
- **PT-187944324:** Redo of changing case table to card results fails
- **PT-187949333:** Index Ordering Issue When Creating Hierarchy and Flattening the Table
- **PT-187693749:** Collapsed rows selection in case table is broken
- **PT-187597588:** Undo functionality fails after delete cases from inspector menu
- **PT-187444682:** Index is sticking when flattening table in Coasters
- **PT-187548205:** Deleting the last attribute of the ungrouped collection does not result in the ungrouped collection being removed
- **PT-187967231:** Undo fails after dragging State to child collection in Roller Coasters
- **PT-187986400:** Clicking on collapsed group brings up index menu
- **PT-187237814:** Undo attribute description change results in incorrect attribute header tooltip
- **PT-187423850:** Fix title of component in Four Seals Example document
- **PT-188009575:** Formula Engine Doesn't Recognize >= and <=

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |  175606 bytes |                            0.77% |
|  index.js | 5460271 bytes |                            1.69% |

## Version 3.0.0-pre.1731 - July 12, 2024

### ✨ Features & Improvements:
- **PT-186227299:** Automation for Inspector menu options of case table
- **PT-187425766:** Persistent ids for cases in hierarchical collections
- **PT-187838529:** User can display a "gaussian fit" normal curve on a histogram
- **PT-187850012:** When the std err and gaussian fit adornments are both showing the gaussian fit label should show the std err computed from estimate of standard deviation
- **PT-187881286:** A gaussianFit URL parameter allows user to display a gaussian fit normal curve on a histogram
- **PT-187737737:** DI Get CaseSearch Requests
- **PT-187737791:** DI Update DataContext ManagingController and Update InteractiveFrame
- **PT-187718437:** DI Create Component Requests
- **PT-185315714:** Pressing the **new attribute** button in the case table moves editor focus to the new attribute name.
- **PT-187864576:** Fix Collaborative plugin
- **PT-187263038:** Bring back undo/redo graph legend tests
- **PT-187323679:** Add checks for undo/redo in axis.spec.ts

### 🐞 Bug Fixes:
- **PT-187262957:** Scatterplot points compress to single point after Undo in various plots
- **PT-187401397:** Legend Box Compression on Window Resize with Multiple Axes
- **PT-187793171:** Can't redo axis change
- **PT-187638145:** Level not created in hierarchy when using Choosy in mammals dataset
- **PT-187309840:** No cases text persists on table in Parachutes sample document
- **PT-187319588:** Categorical label persists on graph after removal in plot with numerical/categorical variables
- **PT-187841073:** Unable to add second y-attribute to scatterplot
- **PT-187849639:** Multidata plugin in nested table or card view mode shows a white background
- **PT-187849648:** Sensor interactive creates new time column when frequency is changed
- **PT-187849622:** Multidata plugin issues with newly added datasets
- **PT-187751419:** Restore of bar chart and histogram doesn't show bars
- **PT-187879648:** Least squares line is not properly split by categorical legend
- **PT-187811059:** Map **Measure** menu ui tuneup
- **PT-187849761:** Click and drag on component title bar title misbehaves
- **PT-187811163:** **Insert Cases** dialog box tuneup
- **PT-187811193:** The graph's camera menu is not bringing up a menu
- **PT-187849983:** The list of example documents should have the same order as they do in V2
- **PT-187809039:** Case table/card icons at left of title bar are wrong
- **PT-187810830:** **Attribute Properties** dialog box tuneup
- **PT-187573237:** The attribute menu in case card is crashing for most items
- **PT-187810451:** Formatting for graph configuration menu is awkward
- **PT-187937515:** Graph Camera Menu Click Issue
- **PT-187906401:** Case card doesn't show units
- **PT-187878126:** Failure to add new category to graph axis

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |  174269 bytes |                            0.13% |
|  index.js | 5415545 bytes |                            0.44% |

## Version 3.0.0-pre.1696 - June 14, 2024

### ✨ Features & Improvements:
- **PT-187459320:** Graph has option to Show Measures for Selection
- **PT-186948982:** The user can configure a numeric univariate plot to display a histogram
- **PT-186948671:** The user can cause a normal curve to be drawn on top of a dot plot
- **PT-187425759:** DataSet: eliminate `ungrouped` "collection"; synchronize attribute handling between DataSet and Collections
- **PT-187751261:** User can plot a normal curve on top of a histogram
- **PT-187278604:** Bring back undo/redo calc component rename tests
- **PT-187692388:** DI Item Requests
- **PT-187709040:** DI ItemSearch Requests
- **PT-187612773:** Add checks for undo/redo of Slider component open and close
- **PT-187612475:** Automation of Graph Inspector panel
- **PT-185315412:** Automation for import of CSV and CODAP docs

### 🐞 Bug Fixes:
- **PT-187637670:** Attribute index sticking issue when hiding attributes in mammals dataset
- **PT-187281586:** Fix webView iframe reload problem
- **PT-187728058:** Marquee selection shows up in wrong subplot
- **PT-187744843:** Axis attribute label not showing
- **PT-187757747:** Drag-switching x-y attributes is broken
- **PT-187751757:** Components disappear behind table when resizing
- **PT-187628465:** Experiments in sampler opening in new tables
- **PT-187333878:** Overlapping URL menu in Sampler Plugin on CODAP
- **PT-187757811:** Rehydrating graph problem

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |  172010 bytes |                            0.37% |
|  index.js | 5391618 bytes |                            0.41% |

## Version 3.0.0-pre.1652 - May 31, 2024

### ✨ Features & Improvements:
- **PT-187578056:** Parent Visibility Toggles should scroll nicely
- **PT-187637447:** DI caseByIndex and caseByID requests
- **PT-181846490:** Case table has tables for each collection
- **PT-187626777:** User can specify how many standard errors are shown in the standard error bar
- **PT-187495137:** An empty value for color attribute type has color editor
- **PT-181840937:** The **Plugins** icon produces a menu of available plugins
- **PT-187573595:** Use numeric ids for plugin compatibility
- **PT-187690238:** DI Collection Requests
- **PT-187651946:** Fix Multidata Plugin
- **PT-187564414:** Fix Choosy Plugin
- **PT-186227302:** Automation for undo/redo in slider component

### 🐞 Bug Fixes:
- **PT-187620092:** Map component zoom range not framed around dataset
- **PT-187615908:** MST warnings on closing graph with assigned attribute
- **PT-187628522:** MST warning on closing map
- **PT-187628148:** Intercept Locked option missing from Measures menu
- **PT-187654045:** Investigate and resolve slow CSV import performance
- **PT-187531276:** CODAP provides **randomBinomial** and **randomNormal**

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |  171367 bytes |                            0.02% |
|  index.js | 5369390 bytes |                            0.02% |

## Version 3.0.0-pre.1652 - May 17, 2024

### ✨ Features & Improvements:
- **PT-187458779:** Graph has option to Show/Hide Parent Visibility Toggles
- **PT-187458777:** Graph has option to Display Only Selected Cases
- **PT-186948720:** User can display a standard error bar on a dot plot
- **PT-187573958:** Fix Sampler Plugin

### 🐞 Bug Fixes:
- **PT-187539044:** Dragging categories on axis does not affect the placement of points
- **PT-187392421:** Unable to reorder categories in categorical legend
- **PT-187619346:** Marquee selection broken in newly created graph

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |  171330 bytes |                            9.60% |
|  index.js | 5356175 bytes |                            3.03% |

## Version 3.0.0-pre.1639 - May 10, 2024

### ✨ Features & Improvements:
- **PT-187527496:** DI updateCases, create, delete, updateCollection Notifications
- **PT-187485557:** DI Choosy Notifications
- **PT-187458777:** Graph has option to Display Only Selected Cases
- **PT-187499873:** Bar chart with numeric legend sorts values in each bar
- **PT-181869324:** Users can switch back and forth between table and card using a menu accessible via a table/card icon in the upper left corner of the title bar.
- **PT-187572179:** Case Card: initial port of v2 code

### 🐞 Bug Fixes:
- **PT-187450934:** Legend compresses on window resize with multiple axes
- **PT-187548327:** Edit collection name UI
- **PT-187033159:** Graph and Calc title does not revert to previous name on undo

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |  169305 bytes |                            8.45% |
|  index.js | 5307568 bytes |                            2.60% |

## Version 3.0.0-pre.1631 - May 3, 2024

### ✨ Features & Improvements:
- **PT-187458550:** DI initial component requests
- **PT-187516358:** DI Attribute Notifications
- **PT-187401278:** Components animate into position and size
- **PT-187531276:** CODAP provides **randomBinomial** and **randomNormal**
- **PT-181840375:** The menu bar displays the current Version and build number

### 🐞 Bug Fixes:
- **PT-187533902:** Adding 10,000 cases to a dataset takes too long
- **PT-187527563:** Document with an attribute computed by a formula does not restore properly

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |  156113 bytes |                           -0.17% |
|  index.js | 5296975 bytes |                            1.09% |

## Version 3.0.0-pre.1522 - April 26, 2024

### ✨ Features & Improvements:
- **PT-187425753:** DataSet: add attributesMap to simplify attribute ordering
- **PT-187391005:** In case table, show swatch when editing a color value
- **PT-187444366:** Dashboard no longer displays DataSummary component
- **PT-187381638:** A basic Case Card component can be made to appear
- **PT-187020075:** In case table/card, a **color picker** can be used to edit a color value
- **PT-181915881:** Dot chart with one categorical axis can be converted to a **bar chart**
- **PT-181962645:** Points on maps can be connected with lines
- **PT-187020220:** Color attributes color rows in case table
- **PT-185315409:** Automation for new attribute in case table
- **PT-187371422:** DI create/update cases
- **PT-187440921:** DI create/delete/get/update dataContext
- **PT-187458550:** DI initial component requests

### 🐞 Bug Fixes:
- **PT-187423678:** Document fails to open after manipulating Mammals graph
- **PT-187185393:** Close and reopen case table should restore position and size
- **PT-187401360:** Function Label Does Not Update to Variable Name in Graph Plot

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |  157690 bytes |                            0.24% |
|  index.js | 5239861 bytes |                            0.79% |

## Version 3.0.0-pre.1521 - April 12, 2024

### ✨ Features & Improvements:
- **PT-186957008:** Automation for Undo/Redo: axis
- **PT-187319504:** Add Cypress checks for multiple y-attributes
- **PT-187338385:** V2 name/title and id/guid/cid compatibility
- **PT-187354366:** DI create/get/update global and get globalList
- **PT-187367138:** DI basic create/get/update selectionList
- **PT-187346867:** DI get itemCount and get caseCount
- **PT-187372266:** DI get/delete allCases
- **PT-187263404:** Initial notify request: global
- **PT-187255353:** A marquee select tool in maps allows users to select points
- **PT-187152587:** The label for a plotted function in a scatterplot uses the name of the attribute on the y-axis
- **PT-187391638:** Calculator position is saved and restored on close and reopen
- **PT-187233618:** Count adornment should show a count per bin when Group into Bins is selected
- **PT-181915881:** Dot chart with one categorical axis can be converted to a **bar chart**

### 🐞 Bug Fixes:
- **PT-187333857:** Missing numbers on Slider axis
- **PT-187326232:** Fix Getting Started with CODAP example document
- **PT-187326224:** Fix Markov Game example document
- **PT-187296100:** "Roller Coasters" file fails to open in Example Docs menu
- **PT-187374319:** Imported V2 maps have a problem when adding a legend
- **PT-187348852:** Can't create graph from second dataset
- **PT-187128104:** Changes in point size aren't discrete wrt undo/redo
- **PT-187381311:** Map grid unable to handle us-cities dataset
- **PT-187399465:** GitHub Pull Requests no longer show coverage

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |  157376 bytes |                            6.08% |
|  index.js | 5198791 bytes |                            0.57% |

## Version 3.0.0-pre.1520 - March 28, 2024

### ✨ Features & Improvements:
- **PT-186957009:** Automation for Undo/Redo: calculator
- **PT-187262806:** Load plugins when importing v2 documents
- **PT-187263361:** Setup Plugin Menu
- **PT-187308636:** Handle update interactiveFrame resize requests
- **PT-187125534:** Graph bin boundaries are draggable
- **PT-187308660:** SPIKE Look into why some plugins aren't loading

### 🐞 Bug Fixes:
- **PT-187314590:** Graph axis not split when categorical attribute added to opposite split
- **PT-187289494:** In a scatterplot with multiple y-attributes, there are extraneous points at the top
- **PT-187289428:** When dragging a scatterplot point with multiple y attributes, points not moving as they should
- **PT-187296306:** CODAP crashes upon graph component resize when "Group into Bins" is applied to Lifespan Data
- **PT-187308847:** WebView iframes render above other elements

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |  147356 bytes |                            0.99% |
|  index.js | 5169173 bytes |                            0.20% |

## Version 3.0.0-pre.1519 - March 22, 2024

### ✨ Features & Improvements:
- **PT-186957025:** Automation for Undo/Redo: legend
- **PT-187125519:** When Group into Bins is chosen, the menu changes to allow the user to change bin width and alignment.
- **PT-187259952:** Respond to get dataContextList requests
- **PT-181962713:** Map points can be displayed as a grid
- **PT-187230453:** Respond to attribute create and delete requests

### 🐞 Bug Fixes:
- **PT-187134147:** V2 map components and graph point properties are not being imported
- **PT-187128104:** Changes in point size aren't discrete wrt undo/redo
- **PT-187213848:** CODAP table attribute creation with out-of-range color value displays blank cell
- **PT-187286536:** Failure to plot multiple y-attributes

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |  145913 bytes |                            0.04% |
|  index.js | 5158753 bytes |                            0.04% |

## Version 3.0.0-pre.1518 - March 14, 2024

### Features/Improvements
- PT-187014891: Color values are displayed in case table and case card as color swatches
- PT-187057225: Respond to attribute get requests
- PT-186948814: The user can configure a univariate plot to group points into bins
- PT-187176366: Respond to attribute update requests
- PT-187194068: Manage plugin interactive state

### Bug Fixes
- PT-187203297: Dragging a color attribute to graph misbehaves
- PT-187142716: Bar for Each Point configuration option breaks axis
- PT-187153567: Clicking on points in dot plot fails to select them
- PT-187188045: Changing attribute type to **none** doesn't work

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |  145250 bytes |                            0.00% |
|  index.js | 5136410 bytes |                            0.43% |

## Version 3.0.0-pre.1517 - March 7, 2024

### Features/Improvements
- PT-181961973: The map **Layers** inspector menu gives users control over map layers
- PT-187005635: Users can specify that an attribute has a **color** data type
- PT-187014891: Color values are displayed in case table and case card as color swatches
- PT-187169360: Remove `sample`/dashboard` url parameters on open/close file
- PT-187005724: A data value in various formats is automatically recognized as a color
- PT-187014833: When an attribute is user-assigned the color type, all 140 web color names are recognized

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |  145250 bytes |                            0.86% |
|  index.js | 5114230 bytes |                            0.29% |

## Version 3.0.0-pre.1516 - February 28, 2024

### Features/Improvements
- PT-186945881: Provide access to existing v2 sample documents in v3/CFM
- PT-186948896: The user can configure a numeric univariate plot to display a bar for each point
- PT-187098593: The map's **Layers** inspector menu gives users control over which base layer is showing
- PT-187057225: Respond to attribute get requests

### Bug Fixes
- PT-187054676: Map inspector not displaying on map creation
- PT-187083507: Fix CFM Create a copy
- PT-186945741: Bug: z-index issues between CFM and CODAP

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |  144010 bytes |                            1.61% |
|  index.js | 5099221 bytes |                            0.63% |

## Version 3.0.0-pre.1515 - February 13, 2024

### Features/Improvements
- PT-186907568: Reimplement data tips after switch to Pixi.js
- PT-186227281: Automation for Undo/Redo
- PT-184210711: Basic file management via CFM, e.g. Open, Close, Save
- PT-186986800: Case Table: column width changes should be undoable and serialized

### Bug Fixes
- PT-186945722: Bug: Google drive error with CFM
- PT-186987479: Misalignment of Buttons in Google Drive Integration with CODAP V3

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |  141727 bytes |                           94.41% |
|  index.js | 5067172 bytes |                           27.07% |

## Version 3.0.0-pre.1502 - January 29, 2024

### Features/Improvements
- PT-186631176: Try to reimplement basic graph features using PixiJS as the points renderer instead of D3 SVG
- PT-186637668: PixiJS graph: Implement sprite-caseID matching and points animations/transitions
- PT-186645440: PixiJS graph: add point hover effect
- PT-186691239: PixiJS graph: avoid excessive CPU workload caused by the Pixi render loop
- PT-186717142: PixiJS graph: Basic dragging behavior
- PT-186725017: PixiJS graph: Point selection via mouse click or shift + click
- PT-186724979: PixiJS graph: Enabling dragging of graph points outside graph boundaries, similar to V2
- PT-186730431: PixiJS map layer: reimplement map dots using PixiJS layerI
- PT-186725312: PixiJS graph: reimplement marquee selection
- PT-186726231: Automation for Map component
- PT-185315423: Automation for toolshelf menu
- PT-186724975: PixiJS graph: Touch support for dragging
- PT-186762653: Case dot size should animate smoothly when Connecting Lines are activated/deactivated
- PT-186864009: Adornments should tell GraphLayout how much space is needed for adornment banners

### Bug Fixes
- PT-186751807: PixiJS graph: redo the transition system for better support of concurrent transitions and user actions
- PT-186747821: PixiJS graph: fix a bug that occurs when a case is deleted during graph transition
- PT-186828511: Adornments do not update when case values change
- PT-186724949: PixiJS graph: Enhancing the reliability of point dragging, preventing 'lost' dragged points, unlike in the SVG version
- PT-186724971: PixiJS graph: Fixing the animation of points returning to their initial position after dragging is completed
- PT-186747801: PixiJS graph: fix interaction with connecting lines
- PT-186781301: Axis not updating when graph plot is split categorically
- PT-186789144: Percent adornment should show subcategories with split plots
- PT-186784214: PixiJS: fix graph rendering in Safari (incorrect offset)
- PT-186828354: Legend Attributes with missing values causes a crash
- PT-186873056: Mean adornment not updating when case value is changed in case table
- PT-186874564: Counts wrong when there are multiple count instances and a top split

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |   72902 bytes |                           -0.28% |
|  index.js | 3987833 bytes |                           13.46% |

## Version 3.0.0-pre.1492 - January 19, 2024

### Features/Improvements
- PT-186681717: **Plotted Value** should show units
- PT-181914458: Count/percent labels change their font size to fit within their allocated space
- PT-186683021: Adornments in exported V2 documents should be rendered when those documents are imported into V3
- PT-186016085: Percentage adornment sub-category should be remembered when changing attributes
- PT-186150345: Show both mean and median adornment values when hovered over a line that represents both values
- PT-185940746: Separate *counts* should display for each region defined by **movable values**
- PT-186035970: Graph adornment elements outside plot should not cover other elements

### Bug Fixes
- PT-186513124: Count adornment does not immediately update when case data modified
- PT-186822118: *Percent* values not always correct
- PT-186834980: Least Squares Line doesn't retain its equation box custom location upon graph resize or import
- PT-186751983: Fix dataset caching

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |   73112 bytes |                            0.55% |
|  index.js | 3514822 bytes |                            0.43% |

## Version 3.0.0-pre.1471 - January 2, 2024

### Features/Improvements
- PT-186556758: Compare various rendering methods in a test repository (e.g. SVG vs D3 vs Canvas/3D, impact of MobX, etc.)
- PT-186548730: Add MST caching helper for multi args methods and cache expensive methods in data configuration model
- PT-181939990: On a scatterplot movable lines and least squares lines can have their **intercepts locked**
- PT-186547994: Optimize methods used to retrieve dataset case values
- PT-181940029: The **Squares of Residuals** option shows a square for each point
- PT-186521999: Maps show a legend for each layer with a legend attribute
- PT-186510502: User can drop an attribute on a map to color points or boundaries
- PT-186647000: Eyeball icon for map component allows hiding and showing of cases
- PT-186437311: Evaluate plotted function adornment formula
- PT-186641108: Map inspector rescale button brings all map data into view
- PT-186631176: Try to reimplement basic graph features using PixiJS as the points renderer instead of D3 SVG
- PT-186479532: Add automated tests of function utils and "other" functions (random, pickRandom, etc.)
- PT-186305230: Graphs with > 20K cases perform well
- PT-181922446: A scatterplot can have **Connecting Lines** between the points
- PT-186637668: PixiJS graph: Implement sprite-caseID matching and points animations/transitions
- PT-186645440: PixiJS graph: add point hover effect
- PT-186691239: PixiJS graph: avoid excessive CPU workload caused by the Pixi render loop

### Bug Fixes
- PT-186580777: Full length of movable line is not returned and it doesn't span entire graph area after the plot is split and unsplit
- PT-186682759: Percent values in subplots not correct
- PT-185577446: Graphs with subplots not rendered correctly on import
- PT-186016145: Treating numeric attribute to categorical should update count and percent adornments correctly
- PT-186648806: Legend is not responding to cases being hidden
- PT-186485885: Some functions don't work within aggregate context (e.g. `mean(lookupByIndex("Mammals", "LifeSpan", caseIndex))`, `mean(if(LifeSpan < 30, 1, 2))`)

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |   72714 bytes |                            0.12% |
|  index.js | 3499653 bytes |                            0.65% |

## Version 3.0.0-pre.1455 - December 4, 2023

### Features/Improvements
- Table should scroll to show collapsed row when it is scrolled out of view [#185270348](https://www.pivotaltracker.com/story/show/185270348)
- Improved graph performance

### Bug Fixes
- Hierarchical case tables more than one level deep do not show grouping lines and expand/collapse buttons [#186208228](https://www.pivotaltracker.com/story/show/186208228)
- Case table contents disappears [#186510549](https://www.pivotaltracker.com/story/show/186510549)

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |   72625 bytes |                            0.14% |
|  index.js | 3476940 bytes |                            0.12% |

## Version 3.0.0-pre.1449 - November 27, 2023

### Features/Improvements
- Precalculate sub-plot cases in GraphDataConfiguationModel [#186496477](https://www.pivotaltracker.com/story/show/186496477)
- On a scatterplot movable lines and least squares lines can have their **intercepts locked** [#181939990](https://www.pivotaltracker.com/story/show/181939990)
- Ensure Attribute#numericCount, Attribute#emptyCount, and Attribute#type are cached (and investigate why they were not(?)) [#186496489](https://www.pivotaltracker.com/story/show/186496489)

### Bug Fixes
- Dragging movable line isn't following the mouse correctly [#186448628](https://www.pivotaltracker.com/story/show/186448628)
- Equation box for Movable Line and LSRL "jumps" when dragged. [#186485315](https://www.pivotaltracker.com/story/show/186485315)

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |   72522 bytes |                               0% |
|  index.js | 3472787 bytes |                            0.09% |

## Version 3.0.0-pre.1444 - November 20, 2023

### Features/Improvements
- Dot plots can be overlaid with a **box plot**. [#181914410](https://www.pivotaltracker.com/story/show/181914410)
- Users can **plot a function** on a scatterplot [#181940062](https://www.pivotaltracker.com/story/show/181940062)
- Handle plotted value formula specific errors + show them in UI [#186358491](https://www.pivotaltracker.com/story/show/186358491)
- **Undo** and **Redo** icons indicate their enabled/disabled state (e.g. with opacity) [#186038023](https://www.pivotaltracker.com/story/show/186038023)
- Handle plotted value formula default attribute [#186358510](https://www.pivotaltracker.com/story/show/186358510)
- A map displays points for datasets that have lat/long attributes [#185781518](https://www.pivotaltracker.com/story/show/185781518)
- Refactor formula-utils, split them into smaller files and improve test coverage [#186452591](https://www.pivotaltracker.com/story/show/186452591)
- Add automated tests of formula manager and formula adapters [#186454270](https://www.pivotaltracker.com/story/show/186454270)
- Add automated tests of semi-aggregate functions, try to test O(n) complexity  [#186479506](https://www.pivotaltracker.com/story/show/186479506)
- Do not serialize attribute values if it has a non-empty formula and make formula attribute cells non-editable [#186424226](https://www.pivotaltracker.com/story/show/186424226)
- Graph inspector has a rescale button that scales the axes to show all the data [#186438328](https://www.pivotaltracker.com/story/show/186438328)
- For a case plot the graph's rescale button causes the points to rerandomize their positions [#186448224](https://www.pivotaltracker.com/story/show/186448224)
- The graph's rescale button is disabled if the plot is not a case plot and has no numeric axes. [#186448263](https://www.pivotaltracker.com/story/show/186448263)
- In the presence of datasets with a boundary attribute, maps include a boundary layer showing polygons [#186304968](https://www.pivotaltracker.com/story/show/186304968)
- Maps have an inspector palette [#186459298](https://www.pivotaltracker.com/story/show/186459298)
- Graph inspector palette allows user to hide selected/unselected cases and show all hidden [#186472161](https://www.pivotaltracker.com/story/show/186472161)
- Simplify updateCategories actions for graph adornments [#186477102](https://www.pivotaltracker.com/story/show/186477102)
- When user rescales graph axes, the rescaling is animated [#186448221](https://www.pivotaltracker.com/story/show/186448221)
- Maps show lat/lng points from multiple datasets when available [#186337165](https://www.pivotaltracker.com/story/show/186337165)
- Map layers are constructed automatically on creation of a map [#181961895](https://www.pivotaltracker.com/story/show/181961895)
- Maps should expand when a user expands the component using the drag handle [#186408583](https://www.pivotaltracker.com/story/show/186408583)

### Bug Fixes
- Handle lookupByIndex and lookupByKey user errors [#186354628](https://www.pivotaltracker.com/story/show/186354628)
- lookupByIndex generates uncaught exception [#186293413](https://www.pivotaltracker.com/story/show/186293413)
- Data tips for points on a map should not show latitude and longitude [#186335272](https://www.pivotaltracker.com/story/show/186335272)
- Undo/redo of switching axes on a dot plot is broken [#186377921](https://www.pivotaltracker.com/story/show/186377921)
- Can't change bounds of bottom axis in graph [#185984385](https://www.pivotaltracker.com/story/show/185984385)
- Case table doesn't fill entire vertical space available when the component's height is increased [#185799414](https://www.pivotaltracker.com/story/show/185799414)
- When an attribute is dropped on a graph, the graph should becomes selected [#186382997](https://www.pivotaltracker.com/story/show/186382997)
- Deleting a slider that is used in a formula shows errors with improper references [#186254226](https://www.pivotaltracker.com/story/show/186254226)
- Deleting a case table should clear all graphs that use it [#185267584](https://www.pivotaltracker.com/story/show/185267584)
- Graph is not properly handling delete of attribute from dataset [#186383038](https://www.pivotaltracker.com/story/show/186383038)
- Global reference added **after** it is added to the formula doesn't get resolved automatically [#186252555](https://www.pivotaltracker.com/story/show/186252555)
- Moving attribute with formula into a parent collection should apply the formula after the move [#186323665](https://www.pivotaltracker.com/story/show/186323665)
- Graph Rescale button gets in wrong state [#186468144](https://www.pivotaltracker.com/story/show/186468144)
- Standard deviation hover tip values are wrong [#186447543](https://www.pivotaltracker.com/story/show/186447543)
- When plotted value or plotted function adornment is hidden, formulas should no longer be recalculated [#186452589](https://www.pivotaltracker.com/story/show/186452589)
- Importing a csv with lat/long attributes should display points for the cases on existing map without further user intervention [#186435138](https://www.pivotaltracker.com/story/show/186435138)
- Fix inefficiency in subPlotCases method making graph interactions slow [#186488009](https://www.pivotaltracker.com/story/show/186488009)

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |   72522 bytes |                            4.38% |
|  index.js | 3469491 bytes |                            2.20% |

## Version 3.0.0-pre.1389 - October 24, 2023

### Features/Improvements
- Dot plots can display **standard deviation** and **mean absolute deviation** [#181914408](https://www.pivotaltracker.com/story/show/181914408)
- Close component should be undoable as a single action [#186075314](https://www.pivotaltracker.com/story/show/186075314)
- A newly created map with no data to display defaults to user location [#186252775](https://www.pivotaltracker.com/story/show/186252775)
- Update all adornment model type properties that are currently set to simple strings [#186297171](https://www.pivotaltracker.com/story/show/186297171)

### Bug Fixes
- Wrong attribute sometimes passed to formula in **Plotted Value** [#186266057](https://www.pivotaltracker.com/story/show/186266057)
- Evaluate plotted value adornment formula [#186267057](https://www.pivotaltracker.com/story/show/186267057)
- Unable to add attribute to graph in presence of two datasets [#186316077](https://www.pivotaltracker.com/story/show/186316077)

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |   69479 bytes |                               0% |
|  index.js | 3394788 bytes |                            0.23% |

## Version 3.0.0-pre.1378 - October 18, 2023

### Features/Improvements
- Handle characters that need escaping in formula single quote strings (e.g. lookup('Attr\\' Name') + 'cons\\'tant') [#186179035](https://www.pivotaltracker.com/story/show/186179035)
- Dot plots can display **standard deviation** and **mean absolute deviation** [#181914408](https://www.pivotaltracker.com/story/show/181914408)

### Bug Fixes
- Dot plot split categorically on x-axis does not show mean and median adornments [#186223632](https://www.pivotaltracker.com/story/show/186223632)
- Improve error handling when an attribute used by formula is deleted [#186201910](https://www.pivotaltracker.com/story/show/186201910)
- Slider values used in formulas are showing decimal places even when they're whole numbers in the slider  [#186218519](https://www.pivotaltracker.com/story/show/186218519)
- Formula evaluation responds dynamically to slider value changes during drag [#186182162](https://www.pivotaltracker.com/story/show/186182162)
- In new dataset formula only applies to first case [#186182255](https://www.pivotaltracker.com/story/show/186182255)
- Adornments not always rendered for all subplots [#186164083](https://www.pivotaltracker.com/story/show/186164083)
- numeric attribute formulas should ignore non-numeric case values [#186235751](https://www.pivotaltracker.com/story/show/186235751)
- V3 formulas support all the arithmetic functions from V2 [#186245938](https://www.pivotaltracker.com/story/show/186245938)
- Develop testing pattern for non-aggregate formula functions [#186245948](https://www.pivotaltracker.com/story/show/186245948)

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |   69479 bytes |                            0.58% |
|  index.js | 3386895 bytes |                            0.14% |

## Version 3.0.0-pre.1360 - October 10, 2023

### Features/Improvements
- Dot plots can show **mean** and **median** [#181914405](https://www.pivotaltracker.com/story/show/181914405)
- Formula is updated when attribute name is changed [#186144182](https://www.pivotaltracker.com/story/show/186144182)
- Formula is updated when global value name is changed [#186166594](https://www.pivotaltracker.com/story/show/186166594)
- Handle characters that need escaping in formula backtick strings (e.g. `Attr\\` Name`) [#186176018](https://www.pivotaltracker.com/story/show/186176018)
- Handle characters that need escaping in formula double quote strings (e.g. lookup("Attr\\" Name") + "cons\\"tant") [#186145125](https://www.pivotaltracker.com/story/show/186145125)
- The **count** function can take an argument [#186185032](https://www.pivotaltracker.com/story/show/186185032)
- Evaluation of formula with mean counts blank cells as 0 in mean calculation [#186145218](https://www.pivotaltracker.com/story/show/186145218)
- Delete attribute from case table should be undoable [#186095272](https://www.pivotaltracker.com/story/show/186095272)

### Bug Fixes
- Syntax error in formula not caught [#186185461](https://www.pivotaltracker.com/story/show/186185461)
- Hierarchical tables don't update properly [#186204753](https://www.pivotaltracker.com/story/show/186204753)
- Formula doesn't work when attribute name is the same as one of the supported functions (e.g. "mean(mean)") [#186152786](https://www.pivotaltracker.com/story/show/186152786)
- Case table content should resize to fill component when component is resized [#186095283](https://www.pivotaltracker.com/story/show/186095283)

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |   69080 bytes |                               0% |
|  index.js | 3382101 bytes |                            0.38% |

## Version 3.0.0-pre.1342 - October 2, 2023

### Features/Improvements
- Import formulas from CODAP V2 documents [#186002016](https://www.pivotaltracker.com/story/show/186002016)
- Add support of formulas referencing attributes with special characters (e.g. whitespace, starting with numbers, unicode)  [#186033178](https://www.pivotaltracker.com/story/show/186033178)
- Attribute formulas evaluate count() function [#186033205](https://www.pivotaltracker.com/story/show/186033205)
- Attribute formulas evaluate if() function [#186040933](https://www.pivotaltracker.com/story/show/186040933)
- Update formulas when attribute is moved between collections [#186040941](https://www.pivotaltracker.com/story/show/186040941)
- Some attribute formulas can be recursive (e.g. prev()) [#186050666](https://www.pivotaltracker.com/story/show/186050666)
- Handle and render formula syntax error [#186052466](https://www.pivotaltracker.com/story/show/186052466)
- `caseIndex` evaluated correctly in attribute formulas [#185896734](https://www.pivotaltracker.com/story/show/185896734)
- Formulas can evaluate nested `prev` calls (e.g. prev(fib, 1) + prev(prev(fib, 1), 1)) [#186090743](https://www.pivotaltracker.com/story/show/186090743)
- Formulas can evaluate nested `next` calls [#186115784](https://www.pivotaltracker.com/story/show/186115784)
- Case table hiding/showing/moving attributes should be undoable [#186138435](https://www.pivotaltracker.com/story/show/186138435)
- Copy formula when moving attribute between parent and child case tables [#186019564](https://www.pivotaltracker.com/story/show/186019564)
- Attribute formulas evaluate simple arithmetic functions (abs, round, etc.) [#185745409](https://www.pivotaltracker.com/story/show/185745409)

### Bug Fixes
- Auto-scroll bugs when dragging attribute from table [#186117412](https://www.pivotaltracker.com/story/show/186117412)

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |   69080 bytes |                            1.89% |
|  index.js | 3369297 bytes |                            0.38% |

## Version 3.0.0-pre.1331 - September 26, 2023

### Features/Improvements
- Any number of **movable values** can be placed on a dot plot [#181914428](https://www.pivotaltracker.com/story/show/181914428)
- **Undo** and **Redo** icons appear in the right portion of the tool shelf [#181840941](https://www.pivotaltracker.com/story/show/181840941)
- Users can add a **Plotted Value** to a scatterplot [#181940090](https://www.pivotaltracker.com/story/show/181940090)
- Dropping attribute on graph axis should be undoable as a single action [#186037220](https://www.pivotaltracker.com/story/show/186037220)
- Dragging slider should create one undo/redo step [#186053996](https://www.pivotaltracker.com/story/show/186053996)
- Dragging/rescaling an axis should be undoable as a single action [#186066006](https://www.pivotaltracker.com/story/show/186066006)
- New table undoable as a single action [#186075309](https://www.pivotaltracker.com/story/show/186075309)

### Bug Fixes
- aggregate functions in formula does not allow using attributes from parent tables [#186026563](https://www.pivotaltracker.com/story/show/186026563)
- Fix fade in / out effects in graph adornment that start to break Cypress tests after upgrade of react-mobx-lite from v3 to v4 [#186031756](https://www.pivotaltracker.com/story/show/186031756)

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |   67800 bytes |                            4.09% |
|  index.js | 3356410 bytes |                            1.71% |

## Version 3.0.0-pre.1307 - September 11, 2023

### Features/Improvements
- Attribute formulas resolve attribute and global references in flat tables [#185745373](https://www.pivotaltracker.com/story/show/185745373)
- Attribute formulas evaluated cross-context lookup functions (e.g. lookupValueByIndex()) [#185745574](https://www.pivotaltracker.com/story/show/185745574)
- Attribute formulas evaluate aggregate functions (e.g. mean(), median()) [#185745450](https://www.pivotaltracker.com/story/show/185745450)
- Attribute formulas evaluate semi-aggregate functions (e.g. prev(), next(), percentile(), etc.) [#185745491](https://www.pivotaltracker.com/story/show/185745491)
- Attribute formulas evaluate random arithmetic functions (random(), randomInteger(), etc.) and re-randomization [#185745433](https://www.pivotaltracker.com/story/show/185745433)
- Formula architecture [#185745365](https://www.pivotaltracker.com/story/show/185745365)
- A dot chart can show percents, or both counts and percents [#185758373](https://www.pivotaltracker.com/story/show/185758373)
- Attribute formulas evaluate correctly in hierarchical collections/tables [#185745420](https://www.pivotaltracker.com/story/show/185745420)
- Support aggregate formulas caching when hierarchical tables are used [#185947550](https://www.pivotaltracker.com/story/show/185947550)
- Evaluate aggregate function against the child-most collection in hierarchical tables (following V2 approach) [#185967142](https://www.pivotaltracker.com/story/show/185967142)
- Detect formulas incorrectly referencing parent or child attributes in hierarchical tables [#185972525](https://www.pivotaltracker.com/story/show/185972525)

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |   65135 bytes |                            0.12% |
|  index.js | 3299955 bytes |                            0.65% |

## Version 3.0.0-pre.1295 - August 10, 2023

### Features/Improvements
- Clicking on legend category key should, if appropriate, select case(s) at the level of the legend attribute. [#185325793](https://www.pivotaltracker.com/story/show/185325793)
- A dot chart can show counts [#181914454](https://www.pivotaltracker.com/story/show/181914454)
- Simple attribute formula editor dialog [#185745389](https://www.pivotaltracker.com/story/show/185745389)
- The user can create a map component using the Map icon in the tool shelf. [#185505604](https://www.pivotaltracker.com/story/show/185505604)
- Number of points in graph is at most the number of cases in the child-most collection for the given attributes [#185447912](https://www.pivotaltracker.com/story/show/185447912)

### Bug Fixes
- Closing Edit Attribute modal using "X" button doesn't restore the previously disabled attribute tooltip [#185757174](https://www.pivotaltracker.com/story/show/185757174)

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
|  main.css |   65059 bytes |                           33.11% |
|  index.js | 3278569 bytes |                            5.45% |

## Version 3.0.0-pre.1286 - July 31, 2023

### Features/Improvements
- Using the ruler menu a **Movable Point** can be added to a scatterplot [#181922730](https://www.pivotaltracker.com/story/show/181922730)
- Tool shelf right buttons [#185700500](https://www.pivotaltracker.com/story/show/185700500)
- When a csv file is imported its case table opens automatically. [#185567223](https://www.pivotaltracker.com/story/show/185567223)
- The **movable line**'s custom pivot and "slide" mouse cursors should change depending on the orientation of the line [#185631489](https://www.pivotaltracker.com/story/show/185631489)

### Bug Fixes
- Changing attributes from numeric to categorical after movable line is drawn should remove the movable line [#185639448](https://www.pivotaltracker.com/story/show/185639448)
- It shouldn't be possible to drag movable line off the axes so that it becomes invisible and inaccessible [#185640617](https://www.pivotaltracker.com/story/show/185640617)
- Changing axis attribute doesn't update Movable Point coordinate information box [#185648727](https://www.pivotaltracker.com/story/show/185648727)
- Changing x-axis attribute removes Movable Point and it never shows again for that graph [#185646724](https://www.pivotaltracker.com/story/show/185646724)
- Movable line shows wrong equation when the line is vertical [#185638862](https://www.pivotaltracker.com/story/show/185638862)
- Changing attributes in graph axes after drawing movable line should update the line equation [#185639335](https://www.pivotaltracker.com/story/show/185639335)
- Replacing one of the axis attributes with a categorical attribute after a movable point is added crashes CODAP [#185646788](https://www.pivotaltracker.com/story/show/185646788)
- Removing one of the axis attributes after a movable point is added crashes CODAP [#185646770](https://www.pivotaltracker.com/story/show/185646770)
- Dragging a csv or codap file into V3 twice causes error. [#183689090](https://www.pivotaltracker.com/story/show/183689090)
- CSV not importing into existing document [#185567221](https://www.pivotaltracker.com/story/show/185567221)
- Transparent background for graph not working [#185707586](https://www.pivotaltracker.com/story/show/185707586)

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
| index.css |   48875 bytes |                            8.58% |
|  index.js | 3108980 bytes |                            0.45% |

## Version 3.0.0-pre.1278 - July 24, 2023

### Bug Fixes
- Remove placeholder green toast when movable line is selected/unselected in ruler menu [#185639719](https://www.pivotaltracker.com/story/show/185639719)
- Removing one or more of the axes attributes from a graph with a movable line does not remove the movable line and its equation [#185639677](https://www.pivotaltracker.com/story/show/185639677)

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
| index.css |   45013 bytes |                            1.28% |
|  index.js | 3095134 bytes |                            0.11% |

## Version 3.0.0-pre.1274 - July 18, 2023

### Features/Improvements
- The box containing a movable line's equation can be repositioned by the user [#185472784](https://www.pivotaltracker.com/story/show/185472784)
- A **movable line**'s "drag handles" should disappear if the graph is not the active component [#185473022](https://www.pivotaltracker.com/story/show/185473022)
- The position of a movable line's equation should be saved and restored when it has become unpinned from the line [#185556213](https://www.pivotaltracker.com/story/show/185556213)

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
| index.css |   44443 bytes |                            0.97% |
|  index.js | 3091787 bytes |                            0.22% |

## Version 3.0.0-pre.1270 - July 10, 2023

### Features/Improvements
- Categories displayed on a categorical axis can be reordered through dragging [#181912254](https://www.pivotaltracker.com/story/show/181912254)
- Vertical scrolling of a table keeps the tables roughly in sync [#181846540](https://www.pivotaltracker.com/story/show/181846540)
- Serialization model for adornments [#185406920](https://www.pivotaltracker.com/story/show/185406920)
- Case table -- floating button for adding new attribute to data set or collection [#184540601](https://www.pivotaltracker.com/story/show/184540601)

### Bug Fixes
- Case table collection banner is too small [#185496585](https://www.pivotaltracker.com/story/show/185496585)
- Graph rehydration bug [#185496498](https://www.pivotaltracker.com/story/show/185496498)
- Graph attribute menu gets clipped by browser window [#185495543](https://www.pivotaltracker.com/story/show/185495543)
- When case is selected the case table scrolls to selected row and brings appropriate parent and child rows into view as well [#185556092](https://www.pivotaltracker.com/story/show/185556092)

### Breaking
- Changed tile ids for case table (`CodapCaseTable` => `CaseTable`), graph (`CodapGraph` => `Graph`), and data summary (`CodapDataSummary` => `DataSummary`) components.

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
| index.css |   44015 bytes |                            0.22% |
|  index.js | 3085135 bytes |                            0.49% |

## Version 3.0.0-pre.1262 - July 5, 2023

### Features/Improvements
- Case table -- floating button for adding new attribute to data set or collection [#184540601](https://www.pivotaltracker.com/story/show/184540601)
- Using a scatterplot's ruler menu the user can add a **movable line**  [#181923044](https://www.pivotaltracker.com/story/show/181923044)

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
| index.css |   43918 bytes |                            6.21% |
|  index.js | 3070242 bytes |                            0.48% |

## Version 3.0.0-pre.1258 - June 26, 2023

### Features/Improvements
- Categories can be reordered by dragging the category keys [#181909789](https://www.pivotaltracker.com/story/show/181909789)
- Category reordering propagates to legends and graph axes [#185325780](https://www.pivotaltracker.com/story/show/185325780)
- Users can drag attributes from graph axes and legend [#185386878](https://www.pivotaltracker.com/story/show/185386878)

### Bug Fixes
- Duplicate droppable areas shown in right y axis [#184758581](https://www.pivotaltracker.com/story/show/184758581)
- Problems plotting points in graph [#185384939](https://www.pivotaltracker.com/story/show/185384939)
- Laggy behavior on resizing components vertically [#185325649](https://www.pivotaltracker.com/story/show/185325649)
- Categorical axis failure to refresh [#185393868](https://www.pivotaltracker.com/story/show/185393868)
- Case Table goes blank when dragging attribute in certain conditions [#184918620](https://www.pivotaltracker.com/story/show/184918620)

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
| index.css |   41352 bytes |                           -0.04% |
|  index.js | 3055443 bytes |                            0.48% |

## Version 3.0.0-pre.1248 - June 12, 2023

### Features/Improvements
- Minimize component [#184228105](https://www.pivotaltracker.com/story/show/184228105)
- Maps have an inspector menu that allows changes to points' properties [#183929126](https://www.pivotaltracker.com/story/show/183929126)
- Marquee selection of points in a graph a categorical axis goes across all categories [#181914402](https://www.pivotaltracker.com/story/show/181914402)
- Graphs can have a background color other than white [#181909370](https://www.pivotaltracker.com/story/show/181909370)

### Bug Fixes
- Horizontal numeric axis labels (numbers) can overflow the component [#184838992](https://www.pivotaltracker.com/story/show/184838992)
- Cases don't display in case table with Firefox [#184921505](https://www.pivotaltracker.com/story/show/184921505)
- Plot points appear in invalid places [#185335006](https://www.pivotaltracker.com/story/show/185335006)
- Allyant `#18`: These elements contain a drag and drop feature that is currently inaccessible to screen reader and keyboard users [#183939719](https://www.pivotaltracker.com/story/show/183939719)
- x-axis attribute drop area is after/below the legend drop area instead of before/above it [#184764820](https://www.pivotaltracker.com/story/show/184764820)
- Slider axis tick marks should not be clipped [#185094851](https://www.pivotaltracker.com/story/show/185094851)

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
| index.css |   41369 bytes |                             2.2% |
|  index.js | 3040823 bytes |                            0.02% |

## Version 3.0.0-pre.1240 - June 5, 2023

### Features/Improvements
- Plots split by categorical attributes on top and right have shaded cells [#185057138](https://www.pivotaltracker.com/story/show/185057138)

### Bug Fixes
- Graphs with multiple numeric y attributes import correctly [#184599671](https://www.pivotaltracker.com/story/show/184599671)

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
| index.css |   40477 bytes |                            0.85% |
|  index.js | 3040194 bytes |                            0.19% |

## Version 3.0.0-pre.1236 - May 30, 2023

### Features/Improvements
- Hierarchical case table -- grouping lines show case relationships [#184540510](https://www.pivotaltracker.com/story/show/184540510)
- Case table button in tool shelf brings up menu [#184771808](https://www.pivotaltracker.com/story/show/184771808)
- Slider axis animates to accommodate new value [#185022661](https://www.pivotaltracker.com/story/show/185022661)

### Bug Fixes
- Case table menu should show current table title [#185255625](https://www.pivotaltracker.com/story/show/185255625)

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
| index.css |   40134 bytes |                            2.92% |
|  index.js | 3034558 bytes |                            0.48% |

## Version 3.0.0-pre.1225 - May 8, 2023

### Features/Improvements
- Hierachical case table -- sub-table titles can be edited by user [#184540405](https://www.pivotaltracker.com/story/show/184540405)

### Bug Fixes
- These elements contain a drag and drop feature that is currently inaccessible to screen reader and keyboard users [#183939719](https://www.pivotaltracker.com/story/show/183939719)
- Slider initial value loads as NaN [#185024367](https://www.pivotaltracker.com/story/show/185024367)

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
| index.css |   38996 bytes |                            0.08% |
|  index.js | 3019991 bytes |                            0.03% |

## Version 3.0.0-pre.1220 - May 1, 2023

### Features/Improvements
- Import Graph Legends when importing graph components [#184942564](https://www.pivotaltracker.com/story/show/184942564)
- Resolve default document confusion [#184771920](https://www.pivotaltracker.com/story/show/184771920)
- Slider animation [#184210591](https://www.pivotaltracker.com/story/show/184210591)

### Bug Fixes
- Graph points are not highlighting when selected [#185024369](https://www.pivotaltracker.com/story/show/185024369)
- Legend attribute menu doesn't open for numeric legends [#184922380](https://www.pivotaltracker.com/story/show/184922380)
- Dragging certain codap files into v3 crashes codap [#183680385](https://www.pivotaltracker.com/story/show/183680385)
- Missing plot point for the last row in case table [#184428764](https://www.pivotaltracker.com/story/show/184428764)
- Graph split plots do not redraw when switching some categorical variables [#184980432](https://www.pivotaltracker.com/story/show/184980432)
- Axis rescale with abalone performs poorly [#185047664](https://www.pivotaltracker.com/story/show/185047664)
- Plot points should not appear in x- or y-axis areas [#184083861](https://www.pivotaltracker.com/story/show/184083861)
- Dragging CODAP docs with no graph or case plot, cases don't show in plot [#183704458](https://www.pivotaltracker.com/story/show/183704458)
- Unable to properly display slider values < 0.01 [#184846919](https://www.pivotaltracker.com/story/show/184846919)
- Imported jsons with graphs that have numeric attributes fail to restore graphs [#184992350](https://www.pivotaltracker.com/story/show/184992350)

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
| index.css |   38964 bytes |                               0% |
|  index.js | 3018956 bytes |                           -0.03% |

## Version 3.0.0-pre.1208 - Apr 25, 2023

### Features/Improvements
- Slider animation [#184210591](https://www.pivotaltracker.com/story/show/184210591)
- Slider axis scale should accommodate the new user-specified slider value if necessary [#184742335](https://www.pivotaltracker.com/story/show/184742335)

### Bug Fixes
- Slider thumb in Slider icon from toolshelf expands [#184918759](https://www.pivotaltracker.com/story/show/184918759)
- Slider axis ends should be inset from tile edges [#184742327](https://www.pivotaltracker.com/story/show/184742327)
- When a slider axis is rescaled, the slider value changes to keep the slider thumb in view [#184742338](https://www.pivotaltracker.com/story/show/184742338)
- A graph with one empty axis should not display "click here" tag unless the graph is selected [#184902952](https://www.pivotaltracker.com/story/show/184902952)
- Drop zone for empty x or y axis is missing when graph tile not selected and attribute present on other axis [#184980011](https://www.pivotaltracker.com/story/show/184980011)
- Graph selection tool doesn't align with mouse cursor [#184953906](https://www.pivotaltracker.com/story/show/184953906)

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
| index.css |   38964 bytes |                            1.99% |
|  index.js | 3019798 bytes |                            0.15% |

## Version 3.0.0-pre.1198 - Apr 18, 2023

### Features/Improvements
- Dropping a categorical attribute on the **top** or **right** edge of a plot splits the graph into sub-graphs containing points belonging to each category [#181947373](https://www.pivotaltracker.com/story/show/181947373)
- Fix basic import of v2 graph components [#184890806](https://www.pivotaltracker.com/story/show/184890806)
- Graphs should be properly restored with imported jsons [#184392252](https://www.pivotaltracker.com/story/show/184392252)
- Graph should have a serializable model that can be exported and imported [#182835566](https://www.pivotaltracker.com/story/show/182835566)

### Bug Fixes
- Dragging an attribute into one graph tile influences another graph tile [#184910642](https://www.pivotaltracker.com/story/show/184910642)
- Marquee selection and point dragging in two separate graphs with case plots are not independent [#184805552](https://www.pivotaltracker.com/story/show/184805552)
- Large numbers in slider values are resetting always to 9007199254740991 [#184879611](https://www.pivotaltracker.com/story/show/184879611)
- Inadvertent numeric axis scale reversal [#184847177](https://www.pivotaltracker.com/story/show/184847177)

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
| index.css |   38203 bytes |                               0% |
|  index.js | 3015152 bytes |                            0.06% |

## Version 3.0.0-pre.1190 - Apr 10, 2023

### Features/Improvements
- DataSets stored with document [#184210544](https://www.pivotaltracker.com/story/show/184210544)
- slider thumb should be draggable and set value of slider when dragged [#184098347](https://www.pivotaltracker.com/story/show/184098347)
- Add functionality to change points properties and graph background properties [#183929138](https://www.pivotaltracker.com/story/show/183929138)
- Implement local JSON export to file [#184210604](https://www.pivotaltracker.com/story/show/184210604)
- Component view UX [#184211652](https://www.pivotaltracker.com/story/show/184211652)
- Slider title bar [#184210579](https://www.pivotaltracker.com/story/show/184210579)
- Handle import/drop of locally exported JSON file [#184210608](https://www.pivotaltracker.com/story/show/184210608)
- Slider has an editable name and value area [#181904681](https://www.pivotaltracker.com/story/show/181904681)
- An **ruler menu** for the case table allows for some miscellaneous user actions [#181870317](https://www.pivotaltracker.com/story/show/181870317)
- Additional attributes can be added to a scatterplot's left vertical axis [#181922568](https://www.pivotaltracker.com/story/show/181922568)
- User can access a basic 4-function calculator [#182087890](https://www.pivotaltracker.com/story/show/182087890)
- #26: This table of editable cells lacks instructions for screen reader users [#183939669](https://www.pivotaltracker.com/story/show/183939669)
- In the presence of a scatterplot, the user can add a numeric attribute to the right vertical axis [#184382030](https://www.pivotaltracker.com/story/show/184382030)
- User can remove attribute from right vertical axis [#184429108](https://www.pivotaltracker.com/story/show/184429108)
- When the user removes the attribute first added to the vertical axis of a scatterplot, any already added additional attributes adjust appropriately [#184382193](https://www.pivotaltracker.com/story/show/184382193)
- A dataset can be hierarchical [#183037507](https://www.pivotaltracker.com/story/show/183037507)
- Close component [#184228103](https://www.pivotaltracker.com/story/show/184228103)
- When placing an attribute on x or y axis, if that attribute is already present on the other axis, the attribute placement flips [#184464241](https://www.pivotaltracker.com/story/show/184464241)
- Cypress tests -- re-enable parallelization [#184541309](https://www.pivotaltracker.com/story/show/184541309)
- Hierarchical case table -- display sub-table title bars [#184540260](https://www.pivotaltracker.com/story/show/184540260)
- Hierarchical case table -- basic scrolling [#184540177](https://www.pivotaltracker.com/story/show/184540177)
- Tile title bars should show name of sample used [#184540309](https://www.pivotaltracker.com/story/show/184540309)
- Hierachical Case Table -- case rendering [#184500603](https://www.pivotaltracker.com/story/show/184500603)
- Hierarchical case table -- selection [#184534547](https://www.pivotaltracker.com/story/show/184534547)
- Support resizing of components by dragging [#184210645](https://www.pivotaltracker.com/story/show/184210645)
- Hierachical case table -- expand/collapse parent cases [#184591244](https://www.pivotaltracker.com/story/show/184591244)
- Support moving of components by dragging [#184210643](https://www.pivotaltracker.com/story/show/184210643)
- CI build -- update dependencies [#184541270](https://www.pivotaltracker.com/story/show/184541270)
- The background of a document is a light grid [#183406722](https://www.pivotaltracker.com/story/show/183406722)
- Support creation of components from tool shelf (free layout) [#184210651](https://www.pivotaltracker.com/story/show/184210651)
- Component selection [#184210626](https://www.pivotaltracker.com/story/show/184210626)
- Support importing existing hierarchical datasets [#184596291](https://www.pivotaltracker.com/story/show/184596291)
- Exported JSON files are easily navigable through IDs with evocative prefixes [#184392892](https://www.pivotaltracker.com/story/show/184392892)
- New components should find empty space to open in [#184667117](https://www.pivotaltracker.com/story/show/184667117)
- Slider should have a standard inspector palette [#184210585](https://www.pivotaltracker.com/story/show/184210585)
- Case table: collection title refinements [#184654960](https://www.pivotaltracker.com/story/show/184654960)
- The case table has a serializable model [#183037545](https://www.pivotaltracker.com/story/show/183037545)
- Slider has a **ruler** menu in its inspector pane [#181904706](https://www.pivotaltracker.com/story/show/181904706)
- Support importing calculator tiles from v2 documents [#184721960](https://www.pivotaltracker.com/story/show/184721960)
- Eliminate Hello component [#184772232](https://www.pivotaltracker.com/story/show/184772232)
- Default to free layout (now that it's sufficiently functional) [#184771654](https://www.pivotaltracker.com/story/show/184771654)
- Global values (e.g. slider values) stored with document [#184221519](https://www.pivotaltracker.com/story/show/184221519)
- Slider title bar should show variable name  [#184667121](https://www.pivotaltracker.com/story/show/184667121)
- Calculator cannot be resized  [#184433094](https://www.pivotaltracker.com/story/show/184433094)
- Dragging components should respect grid to ease alignment [#184738015](https://www.pivotaltracker.com/story/show/184738015)
- Support user ordering of categories [#184772448](https://www.pivotaltracker.com/story/show/184772448)
- Hierarchical case table -- expand/collapse buttons UI [#184540466](https://www.pivotaltracker.com/story/show/184540466)
- Support importing tiles from v2 documents [#184672567](https://www.pivotaltracker.com/story/show/184672567)
- Inspector panels should be rendered outside .codap-component [#184732254](https://www.pivotaltracker.com/story/show/184732254)
- Need to keep inspector palette in bounds from top [#184762302](https://www.pivotaltracker.com/story/show/184762302)
- Show inspector pane for a component when it is selected [#184010053](https://www.pivotaltracker.com/story/show/184010053)
- Dropping a categorical attribute on the **top** or **right** edge of a plot splits the graph into sub-graphs containing points belonging to each category [#181947373](https://www.pivotaltracker.com/story/show/181947373)
- Graphs should be properly restored with imported jsons [#184392252](https://www.pivotaltracker.com/story/show/184392252)
- Graph should have a serializable model that can be exported and imported [#182835566](https://www.pivotaltracker.com/story/show/182835566)
- Fix basic import of v2 graph components [#184890806](https://www.pivotaltracker.com/story/show/184890806)

### Bug Fixes
- Additional content is only revealed on hover, which is inaccessible to screen reader and keyboard users [#183939655](https://www.pivotaltracker.com/story/show/183939655)
- Keyboard users cannot trigger and navigate these menus [#183939697](https://www.pivotaltracker.com/story/show/183939697)
- Points disappear from graph for certain configurations [#184431651](https://www.pivotaltracker.com/story/show/184431651)
- Mosaic layout close components does not behave as expected [#184338815](https://www.pivotaltracker.com/story/show/184338815)
- Crash on **Stroke same color as fill** [#184429037](https://www.pivotaltracker.com/story/show/184429037)
- **Treat as Categorical** is broken [#184535012](https://www.pivotaltracker.com/story/show/184535012)
- Disallow duplicate attributes to be added to the vertical axis [#184440601](https://www.pivotaltracker.com/story/show/184440601)
- Case table/case card toggle does not dismiss on click away [#184553540](https://www.pivotaltracker.com/story/show/184553540)
- Drop targets should not be displayed in graph for areas that won't accept attribute being dragged [#184514913](https://www.pivotaltracker.com/story/show/184514913)
- Case table rows extend beyond case table tile boundaries [#184553678](https://www.pivotaltracker.com/story/show/184553678)
- Closing case table component with categorical attribute plotted in the graph crashes codap [#184503133](https://www.pivotaltracker.com/story/show/184503133)
- Close actions should occur on first click even if component is not selected [#184720342](https://www.pivotaltracker.com/story/show/184720342)
- Clicking in empty document space should deselect all components [#184720373](https://www.pivotaltracker.com/story/show/184720373)
- Inspector Panels should appear within window bounds on right right side [#184508595](https://www.pivotaltracker.com/story/show/184508595)
- After typing a slider variable name, hitting enter should get rid of the edit mode [#184805779](https://www.pivotaltracker.com/story/show/184805779)
- Slider and calculator components created using the toolshelf have heights greater than that required [#184805824](https://www.pivotaltracker.com/story/show/184805824)
- Too much empty vertical space at the bottom of graphs [#184814780](https://www.pivotaltracker.com/story/show/184814780)
- Plot area is wrongly clipping points [#184077414](https://www.pivotaltracker.com/story/show/184077414)
- Graph animation occurring when it shouldn't [#184838483](https://www.pivotaltracker.com/story/show/184838483)
- Drag areas for split numeric axes are incorrect [#184805472](https://www.pivotaltracker.com/story/show/184805472)
- Numeric axis crowding [#184805436](https://www.pivotaltracker.com/story/show/184805436)
- Incorrect responses to changing attributes on graph [#184805909](https://www.pivotaltracker.com/story/show/184805909)
- Slider value should wrap [#184432118](https://www.pivotaltracker.com/story/show/184432118)
- Inadvertent numeric axis scale reversal [#184847177](https://www.pivotaltracker.com/story/show/184847177)
- Marquee selection and point dragging in two separate graphs with case plots are not independent [#184805552](https://www.pivotaltracker.com/story/show/184805552)
- Graph with legend shows spurious green rectangle [#184891112](https://www.pivotaltracker.com/story/show/184891112)
- Categorical axis not getting correct size with split plot [#184891232](https://www.pivotaltracker.com/story/show/184891232)
- Some points don't make it all the way to their position on drop attribute [#184814723](https://www.pivotaltracker.com/story/show/184814723)
- Default values for slider animation are wrong [#184773626](https://www.pivotaltracker.com/story/show/184773626)
- Same numeric attribute plotted on right and left y axes do not plot the correct scatter plot [#184874124](https://www.pivotaltracker.com/story/show/184874124)
- Only one inspector tool should be open at a time [#184869002](https://www.pivotaltracker.com/story/show/184869002)
- Escape should close the slider ruler menu from the inspector panel [#184802559](https://www.pivotaltracker.com/story/show/184802559)
- Unable to add numeric attribute to scatterplot [#184813605](https://www.pivotaltracker.com/story/show/184813605)

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
| index.css |   38203 bytes |                           51.42% |
|  index.js | 3013235 bytes |                           36.11% |

## Version 3.0.0-pre.1089 - Jan 17, 2023

Version 3.0.0-pre.1089 has some bug fixes with accessibility that were found by Allyant and VoiceOver and features related to enabling free component layouts, slider animation, graph brush palette, etc.

### Features/Improvements
- `#26`: This table of editable cells lacks instructions for screen reader users [#183939669](https://www.pivotaltracker.com/story/show/183939669)
- A numeric attribute used as a legend produces a choropleth legend [#184029172](https://www.pivotaltracker.com/story/show/184029172)
- Add functionality to change points properties and graph background properties [#183929138](https://www.pivotaltracker.com/story/show/183929138)
- Slider animation [#184098342](https://www.pivotaltracker.com/story/show/184098342)
- Graph brush palette allows categories to be assigned colors [#183987088](https://www.pivotaltracker.com/story/show/183987088)
- A generic Component exists that serves as a container for any type of component [#183037541](https://www.pivotaltracker.com/story/show/183037541)
- Enable free layout of components (rather than mosaic/dashboard) [#184210630](https://www.pivotaltracker.com/story/show/184210630)
- Slider should use SliderModel prop rather than default SliderModel [#184210554](https://www.pivotaltracker.com/story/show/184210554)
- Graph should use GraphModel prop rather than default GraphModel [#184210550](https://www.pivotaltracker.com/story/show/184210550)

### Bug Fixes
- Incrementing build numbers fails [#184154683](https://www.pivotaltracker.com/story/show/184154683)
- `#30`: Additional content is only revealed on hover, which is inaccessible to screen reader and keyboard users [#183939655](https://www.pivotaltracker.com/story/show/183939655)
- `#25`: Keyboard users cannot trigger and navigate these menus [#183939697](https://www.pivotaltracker.com/story/show/183939697)
- Case plot points are not responding to change in window size [#184125835](https://www.pivotaltracker.com/story/show/184125835)

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
| index.css |   25230 bytes |                            6.22% |
|  index.js | 2213793 bytes |                            4.08% |

## Version 3.0.0-pre.1085 - Jan 3, 2023

Version 3.0.0-pre.1085 is the first weekly build for codap v3. This build has features to show the inspector menu, legend labels menu, brush palette menu and the slider play button. It also has a few bug fixes related to legends and accessibility that were found by Allyant.

### Features/Improvements
- Components have an (optional) inspector pane that shows when they are clicked [#181465538](https://www.pivotaltracker.com/story/show/181465538)
- Slider has a **play** button [#181904649](https://www.pivotaltracker.com/story/show/181904649)
- Graphs have an inspector menu that allows changes to points' properties [#181909355](https://www.pivotaltracker.com/story/show/181909355)
- A **dot plot** can be “split” by a categorical attribute on the perpendicular axis [#181914397](https://www.pivotaltracker.com/story/show/181914397)
- Dot plots split by categorical attribute have lines parallel to the numeric axis delimiting each of the categories. [#183961343](https://www.pivotaltracker.com/story/show/183961343)
- Brush palette settings are reflected in plot [#183977208](https://www.pivotaltracker.com/story/show/183977208)
- Add menu to Legend Labels [#183808952](https://www.pivotaltracker.com/story/show/183808952)
- Graph inspector panel **ruler** [#183939264](https://www.pivotaltracker.com/story/show/183939264)
- #26: This table of editable cells lacks instructions for screen reader users [#183939669](https://www.pivotaltracker.com/story/show/183939669)

### Bug Fixes
- Legend bar is getting clipped from bottom [#183681037](https://www.pivotaltracker.com/story/show/183681037)
- Legend label and keys are improperly positioned [#183656309](https://www.pivotaltracker.com/story/show/183656309)
- **Treat as** isn't switching properly [#183822453](https://www.pivotaltracker.com/story/show/183822453)
- Graph attribute menu is difficult to dismiss [#183822145](https://www.pivotaltracker.com/story/show/183822145)
- #30: Additional content is only revealed on hover, which is inaccessible to screen reader and keyboard users [#183939655](https://www.pivotaltracker.com/story/show/183939655)
- #25: Keyboard users cannot trigger and navigate these menus [#183939697](https://www.pivotaltracker.com/story/show/183939697)
- Categorical cases do not get highlighted when switching from a numerical to a categorical attribute in the graph [#183820198](https://www.pivotaltracker.com/story/show/183820198)
- Not all points appear after change from dot plot to dot chart [#184065597](https://www.pivotaltracker.com/story/show/184065597)
- Plot area is wrongly clipping points [#184077414](https://www.pivotaltracker.com/story/show/184077414)
- Y-axis space is not properly allocated when numbers have commas [#184103711](https://www.pivotaltracker.com/story/show/184103711)
- Case plot isn't responding initially to marquee select or click select [#184103721](https://www.pivotaltracker.com/story/show/184103721)

### Asset Sizes
|      File |          Size | % Increase from Previous Release |
|-----------|---------------|----------------------------------|
| index.css |   23753 bytes |                              n/a |
|  index.js | 2204800 bytes |                              n/a |
