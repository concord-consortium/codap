# Changelog
## Version 3.0.0-pre.1089 - Jan 17, 2023

Version 3.0.0-pre.1089 has some bug fixes with accessibility that were found by Allyant and VoiceOver and features related to enabling free component layouts, slider animation, graph brush palette, etc.

### Features/Improvements
- #26: This table of editable cells lacks instructions for screen reader users [#183939669](https://www.pivotaltracker.com/story/show/183939669)
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
- #30: Additional content is only revealed on hover, which is inaccessible to screen reader and keyboard users [#183939655](https://www.pivotaltracker.com/story/show/183939655)
- #25: Keyboard users cannot trigger and navigate these menus [#183939697](https://www.pivotaltracker.com/story/show/183939697)
- Case plot points are not responding to change in window size [#184125835](https://www.pivotaltracker.com/story/show/184125835)

### Asset Sizes
|      File |          Size |
|-----------|---------------|
| index.css |   25230 bytes |
|  index.js | 2213793 bytes |

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
