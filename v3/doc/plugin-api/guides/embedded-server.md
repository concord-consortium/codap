# Embedding CODAP in your page

> **Applies to:** CODAP v3 · **Verified:** 2026-10-22

Everywhere else in this reference, your plugin runs inside CODAP. This chapter covers the reverse:
CODAP runs inside *your* page, in an iframe, and your page talks to it through the same API.
CODAP calls this its embedded server. Your page sends the same requests a plugin sends and
receives the same notifications. The differences come from one fact: your page is not a
component in CODAP's document.

This chapter calls your page the *host page*.

## Turning it on

Two URL parameters on CODAP's URL turn on the embedded server:

| Parameter | What it does |
|---|---|
| `embeddedServer=yes` | Starts the embedded server. CODAP looks and behaves as usual. |
| `embeddedMode=yes` | Starts the embedded server, and also strips CODAP down to fit inside your page: it hides the menu bar and toolbar, makes the background transparent, and moves undo and redo into the components' title bars. |

Each also accepts `true` or `1`. With `embeddedMode`, `embeddedServer` is not needed.

The server starts only when CODAP is in an iframe. Opened in its own tab, CODAP starts no server,
though `embeddedMode` still changes how it looks.

**The embedded server requires an iframe.** CODAP answers requests only from the page that
embeds it in an iframe, not from JavaScript running on CODAP's own page. v2 also offered the API
to same-page scripts; v3 does not.

## Connecting

The host page creates an iframe-phone endpoint aimed at CODAP's iframe, with the same
`"data-interactive"` channel a plugin uses:

```html
<iframe id="codap" src="https://codap.concord.org/app/?embeddedMode=yes"></iframe>
<script src="https://unpkg.com/iframe-phone@1.4.0/dist/iframe-phone.js"></script>
<script>
  const codapFrame = document.getElementById("codap")
  const codapOrigin = new URL(codapFrame.src).origin
  const phone = new iframePhone.IframePhoneRpcEndpoint(
    requestHandler, "data-interactive", codapFrame, codapOrigin)
</script>
```

The fourth argument is CODAP's *origin*, such as `https://codap.concord.org`, not its full URL.
iframe-phone ignores every message whose origin does not match it exactly, so passing the URL
leaves the host page deaf to CODAP.

`requestHandler` is the same kind of function a plugin passes: CODAP calls it with a message, and
the host page calls `callback` when it is done. Its first message is always `codap-present`:

```json
{ "message": "codap-present" }
```

```js
// sendRequest stands for however your page sends requests (here, phone.call), as in the rest
// of this reference.
function requestHandler(command, callback) {
  if (command.message === "codap-present") {
    // CODAP is listening; requests can be sent from here on
    sendRequest({ action: "get", resource: "dataContextList" })
  } else if (command.action === "notify") {
    // a notification, as described in the notification catalog
  }
  callback({ success: true })
}
```

**`codap-present` means CODAP is listening, not that its document has loaded.** CODAP sends it as
it starts up, before it loads a document named in its URL or creates the data set for a `sample`
parameter. A request sent right away can find a document that is still empty.

## Sending requests

Requests from the host page work as they do from a plugin. They are processed in order, one at a
time, each with exactly one response, in a queue of the host page's own. If a plugin has turned
on `blockAPIRequestsWhileEditing`, the host page's requests are held along with every plugin's
while the user edits that plugin's data; see
[Requests while the user is editing](request-processing.md#requests-while-the-user-is-editing).
See [How CODAP processes requests](request-processing.md) for the rest.

What the host page cannot do is ask about itself. A plugin's requests can refer to the
component it runs in; the host page has none. So `interactiveFrame` fails with
`Interactive Frame not found` when the host page sends it. A few other resources fail from the
host page too, though they should not; see [Known limitations](#known-limitations).

## Receiving notifications

**The host page receives notifications only once it has sent a request.** Until then CODAP sends
it nothing but `codap-present`. A host page that only wants to listen should send any request,
such as `get dataContextList`, as soon as `codap-present` arrives.

From then on, the host page receives every notification CODAP sends to all plugins: data
changes, selection changes, components created and deleted, and the rest of
[the notification catalog](../notifications.md). It also hears about changes its own requests
make, including components it creates, which a plugin is not told about.

It receives none of the notifications sent to one plugin or to plugins that opted in:

- `newDocumentState` goes only to plugins with `subscribeToDocuments`, a property of
  `interactiveFrame`, so a `get document` from the host page delivers the document to those
  plugins and not to the host page.
- `undoAction` and `redoAction` go only to the plugin that reported the action.
- `localeChanged` goes only to plugins that set `handlesLocaleChange`, so the host page is not
  told when the user switches language.

When the host page or a plugin sends `update document`, CODAP sends `updateDocumentBegun` and
`updateDocumentEnded` to every plugin and to the host page.

## Known limitations

**`undoChangeNotice` fails from the host page.** Every operation, including
`undoButtonPress` and `redoButtonPress`, returns `Interactive Frame not found`. v2 accepted all
three from the host page: it put the host page's actions on the undo history and sent the host
page `undoAction` and `redoAction`. This is a known bug.

**`configuration`, `configurationList` and `logMessageMonitor` fail from the host page.**
`configuration` returns `Interactive Frame not found`, `get configurationList` returns an error,
and registering a log monitor returns `clientId and filter values are required`. v2 answered all
three. This is a known bug.

**`logMessage` from the host page is not logged.** It reaches any registered log monitors but is
not written to CODAP's log, as v2 wrote it. This is a known bug.

## See also

- [The resource index](../README.md) for the request envelope and the iframe-phone connection a
  plugin makes
- [The notification catalog](../notifications.md) for what the host page receives
- [How CODAP processes requests](request-processing.md) for order, array requests and holds
