# Language and locale

> **Applies to:** CODAP v3 · **Verified:** 2026-10-17

CODAP runs in one of several languages, and the user can switch between them while working. This
chapter covers how your plugin learns which language CODAP is in, and what happens to your plugin
when the user switches.

## Which language CODAP is in

CODAP starts in the language named by its own `lang` URL parameter, if CODAP has strings for it,
and otherwise in the first of the browser's preferred languages that it has, falling back to US
English. Where it has strings only for the base language, it uses that: asked for `pt-PT`, it
runs in `pt`. The user can change the language later from CODAP's language menu.

Your plugin is told the language two ways, and both carry the same two values.

**In your plugin's URL.** CODAP adds `lang` and `locale` query parameters to the URL it loads
your plugin from:

```
https://example.org/my-plugin/index.html?lang=pt&locale=pt-BR
```

If your plugin's URL already has a `lang` or `locale` parameter, CODAP replaces it.

**From `interactiveFrame`.** A `get` returns the same values, among the frame's other
properties:

```json
{ "action": "get", "resource": "interactiveFrame" }
```

```json
{
  "success": true,
  "values": { "lang": "pt", "locale": "pt-BR", "name": "My Plugin" }
}
```

The response is shortened here; see [`interactiveFrame`](../resources/interactive-frame.md) for
everything it returns.

## `lang` and `locale`

`locale` is the full locale CODAP is running in: `pt-BR`, `zh-TW`, `zh-Hans`. `lang` is only its
base language: `pt`, `zh`. `lang` keeps that short form because plugins written for v2 expect
it, and some fail when given a region they have no strings for.

Read `locale` if your plugin has strings for regional variants, such as both Traditional and
Simplified Chinese. Read `lang` if it has one set of strings per language. Either way, fall back
to a language you do have when the value is one you don't.

## When the user switches language

By default, **CODAP reloads your plugin** when the user switches language. It loads your plugin's
URL again with the new `lang` and `locale`, so a plugin that reads them at startup needs nothing
more. The reload loses whatever state your plugin had not saved; see
[`interactiveFrame`](../resources/interactive-frame.md) for how a plugin saves its state with the
document.

### Switching without a reload

A plugin that can change its language in place can ask CODAP not to reload it:

```json
{
  "action": "update",
  "resource": "interactiveFrame",
  "values": { "handlesLocaleChange": true }
}
```

From then on, when the user switches language, CODAP leaves your plugin loaded and sends it a
notification instead:

```json
{
  "action": "notify",
  "resource": "global",
  "values": { "operation": "localeChanged", "lang": "es", "locale": "es" }
}
```

Your plugin changes its language and replies:

```js
// sendRequest stands for however your plugin sends requests, and requestHandler is the
// handler you passed to iframePhone — see "Sending requests and receiving notifications"
// in the index.
function requestHandler(command, callback) {
  if (command.resource === "global" && command.values?.operation === "localeChanged") {
    setLanguage(command.values.locale)
  }
  callback({ success: true })
}

sendRequest({
  action: "update",
  resource: "interactiveFrame",
  values: { handlesLocaleChange: true }
})
```

Three things to know before you rely on it:

- **Asking reloads your plugin once.** While CODAP may reload your plugin, it adds `lang` and
  `locale` to your plugin's URL. Once you set `handlesLocaleChange`, it stops adding them, and
  loading the URL without them reloads your plugin. The reloaded plugin starts without `lang` or
  `locale` in its URL, so read them from `interactiveFrame` instead. Set `handlesLocaleChange`
  as early as you can, before your plugin does work it would lose.
- **The setting is not saved with the document.** Set it every time your plugin loads. When the
  document is opened again, your plugin starts with the setting off, so the first request turns
  it on and reloads your plugin once more.
- **Only plugins that ask receive `localeChanged`.** Each one gets its own notification. Every
  other plugin is reloaded.

## Compared with v2

v2 had no way to switch language in place. Choosing a language reloaded all of CODAP, and every
plugin with it, with the new `lang` in each plugin's URL. So a plugin written for v2 behaves the
same in v3: it is reloaded and reads `lang` at startup. `locale`, `handlesLocaleChange` and
`localeChanged` are new in v3.

## See also

- [`interactiveFrame`](../resources/interactive-frame.md) for `lang`, `locale` and
  `handlesLocaleChange`
- [The notification catalog](../notifications.md#everything-else) for `localeChanged`
- [The resource index](../README.md) for the request envelope and how notifications arrive
