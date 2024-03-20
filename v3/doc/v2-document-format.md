# Notes on the CODAP v2 Document Format

## Introduction and Notes

### Identifiers

V2 uses a SproutCore inspired id-generation system in which ids are generated monotonically starting at 1 (1, 2, 3, ...). Each model object is assigned its `id` when it is registered with the `DG.Store`. The `DG.Store` maintains an internal `_idCount` property to track the next id to be generated and this value is written out to documents as the `idCount` property. When store objects are serialized, they general write out both an `id` property and a `guid` property with the same value in their `toArchive` methods. As of this writing the intended purpose of this redundant `guid` property is not clear. The plugin API allows matching by these ids, so they will need to be maintained in v3 for compatibility with existing plugins.

This id-generation system works fine for generating ids that are unique within the document, but creates problems when document interchange is required. At some point, these limitations led to the introduction of a `cid` (collaboration id) property on some objects, notably attributes and "items", which are part of the representation of cases. (See the corresponding document on `hierarchical-data.md` for details on cases and items.) The `cid` property is a 16+ character id like those used in v3 by default.

Q: Should v3 implement an incrementing id system like v2's in addition to its longer random ids for use by plugins or can we get away with just the longer unique ids?

### Names and Titles

In v2 several important classes, including `DG.DataContext`, `DG.Collection`, and `DG.Attribute` have both a `name` property and a `title` property. For these classes, the `title` property is implemented as a function which is backed by a local `_title` property such that setting the `title` property sets the underlying `_title` property, while getting the `title` retrieves the `_title` property (if it has been set) or the `name` property if it hasn't.

The upshot of all of this is that the `name` and `title` properties are both potentially human-readable, but the `name` property is fixed for the life of the object while the `title` property is user-modifiable. This distinction is important to the plugin API where objects requested by name can match on the internal `name` of the object even after the `title` has been changed. Note that the API only seems to match on `name`, never on `title`. When looking up objects, the plugin API consistently checks `name` first and `id` second.

For v3 we must decide whether to bring this same system forward and/or how to preserve the behavior of existing plugins with whatever system we implement in v3.

## Components

Components are stored in a top-level `components` array.

## Data Contexts

Data contexts are stored in a top-level `contexts` array.

### Collections

Collections are stored in a `collections` array within each `context`.

### Attributes

Attributes are stored in an `attrs` property within each `collection`.
