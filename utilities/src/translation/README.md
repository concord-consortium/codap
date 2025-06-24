# Localization

The modules within `utilities/translation` can be used to add text localization to an application.

### How to use

#### Adding translation files

In CODAP, JSON files are added to `utilities/translation/lang` by the `strings:pull` script, which pulls them from POEditor. This downloads a JSON file for each translated language, which is then imported into `utilities/translation/translate.ts`. The name of each translation JSON file is the ISO 639-1 Language Code for the given language (i.e., `fr.json` for French or `de.json` for German). The JSON files contain a key/value pair for each translated word or phrase. The key is used by the translation function and the value is the actual translated text.
```
{
  "TEXT": "text",
  "INTRO.HELLO": "Hello World"
}
```

#### Using the translate function

Import the `translate` function found in `utilities/translation/translate.ts` in your module:
```
import { t } from "../utils/translation/translate";
```

Call the function using the translation key of the desired text:
```
console.log(t("INTRO.HELLO"));
```

Variables can be defined and specified in your translated text. In addition to the named variable mechanism used by most CC projects (`%{VAR_NAME}`), CODAP supports a numbered variable system that originated with SproutCore (`%@`, `%@1`, `%@2`). To add a named variable to a key's value in the translation JSON file:
```
{
  "AGE": "I am %{userAge} years old"
}
```
Use the `vars` property of the `options` parameter to specify one or more variable values when calling the translation function:
```
console.log(t("AGE", { vars: { userAge: "25" } }));
```
To add positional variables:
```
{
  "AGE": "I will be %@1 years old in %@2."
}
```
Use the `vars` property of the `options` parameter to specify one or more variable values when calling the translation function:
```
console.log(t("AGE", { vars: [25, 2025] } }));
```

#### Determining the current language
The `translate` function will first get the HTML DOM `lang` attribute of the root element of the document to determine the current page language.  If no `lang` attribute is specified, then the `translate` function will get the first valid language specified by the browser to determine the current page language.  Optionally, a language value can be specified when calling the `translate` function that will override the `lang` attribute and the browser settings.  Use the `lang` property of the `options` parameter to specify a language when calling the `translate` function:
```
console.log(t("INTRO.HELLO", { lang: "es" }));
```
