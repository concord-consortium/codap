# Starter Projects Localization

The modules within `utils/translation` can be used to add text localization to a starter-projects based application.

### How to use

#### Adding translation files

Translation JSON files are added to `utils/translation/lang`.  Add a translation JSON file for each translated language and import the translation JSON file in `utils/translation/translate.ts`.  Name the translation JSON file using the ISO 639-1 Language Code for the given language (i.e., `fr.json` for French or `de.json` for German).  Add a key/value pair for each translated word or phrase.  The key is used by the translation function and the value is the actual translated text.
```
{
  "TEXT": "text",
  "INTRO.HELLO": "Hello World"
}
```

#### Using the translate function

Import the `translate` function found in `utils/translation/translate.ts` in your module:
```
import t from "../utils/translation/translate";
```

Call the function using the translation key of the desired text:
```
console.log(t("INTRO.HELLO"));
```

Variables can be defined and specified in your translated text.  Use the format `%{VAR_NAME}` to add a variable to a key's value in the translation JSON file:
```
{
  "AGE": "I am %{userAge} years old"
}
```
Use the `vars` property of the `options` parameter to specify one or more variable values when calling the translation function:
```
console.log(t("AGE", { vars: { userAge: "25" } }));
```


#### Determining the current language
The `translate` function will first get the HTML DOM `lang` attribute of the root element of the document to determine the current page language.  If no `lang` attribute is specified, then the `translate` function will get the first valid language specified by the browser to determine the current page language.  Optionally, a language value can be specified when calling the `translate` function that will override the `lang` attribute and the browser settings.  Use the `lang` property of the `options` parameter to specify a language when calling the `translate` function:
```
console.log(t("INTRO.HELLO", { lang: "es" }));
```
