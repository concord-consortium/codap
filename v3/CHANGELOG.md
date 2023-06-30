# Changelog

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
