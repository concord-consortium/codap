## invalid-content.codap
This has an invalid content field.
The invalid content field means that the `isClientContent` function provided to the CFM by CODAP returns false.
However since there is a content field (even though it is invalid) the CFM thinks this document is "wrapped" so it only sends the value of the content field to CODAP instead of the whole document.

So CODAP receives a document of `{"invalid": "value"}`.

**this does not cause a visible error.**
It isn't obvious how to handle it better. We don't want to reject documents with unknown fields to allow new fields without crashing old versions of CODAP, so unknown properties are just ignored. We could reject the document because it doesn't have the `type: "CODAP"` or because it doesn't have `content.rowMap` and `content.tileMap` fields, but maybe that is too restrictive?

## invalid-json.codap
Not a valid JSON document.
The CFM catches this and sends CODAP a string of the document.
CODAP throws an error when it gets a string document.
This is caught and the CFM callback is called telling the CFM there was an error opening the document.

## invalid-rowmap.codap
This has a content field but its rowMap is invalid. The fact that there are rowMap and tileMap fields convinces the `isClientContent` function this is a valid CODAP document.
However when the document is parsed by MST the invalid rowMap causes an error to be thrown.
This is caught and the CFM callback is called telling the CFM there was an error opening the document.

## numeric-version-with-content.codap
This has a valid CODAPv3 content field.
The numeric version trips up the MST processor.
This is caught and the CFM callback is called telling the CFM there was an error opening the document.

## numeric-version.codap
This has a numeric version but no content field.
The missing content field means the `isClientContent` function provided to the CFM by CODAP returns false.
Since there is no content field the CFM decides this document is not "wrapped" so it sends the full document to CODAP.
The numeric version trips up the MST processor.
This is caught and the CFM callback is called telling the CFM there was an error opening the document.
