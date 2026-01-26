// Detect if the browser supports ES2020 features required by CODAP
// This file must use ES5 syntax so it runs on older browsers
// If unsupported, we replace the entire page with an error message
(function() {
  var isSupported = false;
  try {
    // Test for ES2020 features: optional chaining and nullish coalescing
    // These are syntax features that will throw SyntaxError in older browsers
    new Function('var obj = {}; return obj?.foo ?? "default"')();
    isSupported = true;
  } catch (e) {
    isSupported = false;
  }

  if (!isSupported) {
    // Replace the entire document to prevent the ES2020 bundle from loading
    var html = [
      '<!DOCTYPE html>',
      '<html style="height: 100%;">',
      '<head>',
      '<meta charset="UTF-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
      '<title>CODAP - Browser Not Supported</title>',
      '<link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap" rel="stylesheet">',
      '<style>',
      'html, body { height: 100%; margin: 0; }',
      'body { display: flex; align-items: center; justify-content: center; background-color: #f5f5f5; font-family: Lato, "Helvetica Neue", Helvetica, Arial, sans-serif; }',
      '.container { max-width: 600px; padding: 40px; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; margin: 20px; }',
      'h1 { color: #333; margin: 0 0 20px 0; font-size: 24px; }',
      'p { color: #666; line-height: 1.6; margin: 0 0 20px 0; }',
      'ul { color: #666; line-height: 1.8; text-align: left; margin: 0 0 20px 0; padding-left: 20px; }',
      '.footer { color: #999; font-size: 14px; margin: 0; }',
      'a { color: #0066cc; }',
      '</style>',
      '</head>',
      '<body>',
      '<div class="container">',
      '<h1>Browser Not Supported</h1>',
      '<p>CODAP requires a modern browser with ES2020 support. Your current browser does not meet the minimum requirements.</p>',
      '<p>Please update your browser to the latest version, or try one of these browsers:</p>',
      '<ul>',
      '<li>Google Chrome (version 80 or later)</li>',
      '<li>Mozilla Firefox (version 74 or later)</li>',
      '<li>Microsoft Edge (version 80 or later)</li>',
      '<li>Safari (version 13.1 or later)</li>',
      '</ul>',
      '<p class="footer">For more information, visit <a href="https://codap.concord.org/help/faqs/">codap.concord.org</a></p>',
      '</div>',
      '</body>',
      '</html>'
    ].join('');
    document.open();
    document.write(html);
    document.close();
    // Stop all further resource loading to prevent the main bundle from executing
    window.stop();
  }
})();
