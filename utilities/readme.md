This is a collection of utilities use across the CODAP codebase.

# Things that should be improved

## Translation code
The translation library is here along with all of the translations. Because this package is used by non-CODAP applications too, there is no reason to include all of the CODAP translations.

The actually translations should be extracted from here and each package that uses the translation support in utilities should provide its own translations.  The date-utils module within this package use some of the translations, so any solution has to handle that too.

Because the translation system is useful by itself outside of this utilities package. It would be could to make it into its own package. It currently depends on the url-params which defines all of the CODAP params.

## URL Params
This defines all of the url params that CODAP supports. non-CODAP applications using this package don't need to know about all of these url params. The main reason the url params are here is because the translation system uses them.
