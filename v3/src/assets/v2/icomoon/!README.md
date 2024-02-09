### Q: Where do I find a CODAP v2 icon that doesn't appear to be in the v2 source?

### A: It's probably in this folder.

CODAP v2 uses a custom font (icomoon) created with [IcoMoon](https://icomoon.io/) for embedding many of its icons. This was a common technique back in the day for reducing the number of assets the browser had to deal with. These days we manage our assets with webpack, SVGR, etc. so we haven’t bothered to bring the icon font forward. That said, we seem to have lost track of the original image files that were used to generate the custom font, so this folder contains the results of using an [online tool](https://iconly.io/tools/font-to-icons-converter) to extract the icons from the custom font. Unfortunately, when the tool extracts the files, they often don’t have meaningful names, so you may have to perform a sequential search to find a particular icon of interest.

### Q: I found the one I'm looking for. How should I use it in v3?

While it could be imported from this folder directly, we recommend copying it to one of the standard icon folders and giving it an appropriate name (if it doesn't already have one). That way we can eventually retire this folder once we've extracted all the icons we need from it. Then you can import it normally and use it like any other React component because we're using SVGR as part of our webpack build.
