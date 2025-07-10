# generateBoundaryThumbnails

A tool to generate thumbnail image files as data uri within properly defined 
CODAP boundary documents.
A CODAP boundary document is a CODAP document that has a single data context
with a top level collection named "boundaries" which, in turn, has an attribute
named "boundary". Cases in this collection have GeoJSON values for this 
"boundary" attribute. Usually they will have a child collection of keys.

GeoJSON permits additional properties to be included in the JSON objects. 
This tool will add a property, "properties.THUMB", whose value will be a data URI
of a .png thumbnail representation of the boundary data.

## Installation

This tool requires installation of LibRSVG library and header files. This is an 
OS-dependent step. See https://www.npmjs.com/package/librsvg. For example, for
Mac OS X:

    brew install librsvg
    
Then, in this directory, run

    npm install

## Usage

    npm run generate boundary-file.codap > new-boundary-file.codap

or

    node app.js boundary-file.codap > new-boundary-file.codap
    