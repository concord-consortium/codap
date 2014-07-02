// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  @class

  A file import element presents a interactive element for selecting a
  file from the local file system for upload.

  @extends SC.TextFieldView
 */
DG.FileImportView = SC.TextFieldView.extend(
  /** @scope SC.TextFieldView.prototype */ {

  classNames: ['dg-file-import-view'],


  // ..........................................................
  // PROPERTIES
  //

  /**
    When `applyImmediately` is turned on, every keystroke will set the value
    of the underlying object. Turning it off will only set the value on blur.

    @type String
    @default NO
   */
  applyImmediately: NO,

  /**
    The type attribute of the input.

    @type String
    @default "file"
   */
  type: 'file',


  /**
    Whether the browser should automatically correct the input.

    When `autoCorrect` is set to `null`, the browser will use
    the system defaults.

    @type Boolean
    @default YES
   */
  autoCorrect: NO,

  /**
    Whether the browser should automatically capitalize the input.

    When `autoCapitalize` is set to `null`, the browser will use
    the system defaults.

    @type Boolean
    @default YES
   */
  autoCapitalize: NO,

  /**
    Whether to show the hint while the field has focus.
    If `YES`, it will disappear as soon as any character is in the field.

    @type Boolean
    @default YES
   */
  hintOnFocus: NO,

  /**
    This property will enable disable HTML5 spell checking if available on the
    browser. As of today Safari 4+, Chrome 3+ and Firefox 3+ support it.

    @type Boolean
    @default YES
   */
  spellCheckEnabled: NO,
  /**
     Whether to render a border or not.

     @type Boolean
     @default YES
  */
  shouldRenderBorder: NO,

    /**
     * Callback invoked when the view focuses or blurs.
      */
  stateChangeAction: function () {
    if (this.action) {
      this.action();
    }
  }.observes('isEditing'),

  files: function() {
    var v =this.$input().prop('files');
    console.log('files: ' + v);
    return v;
  }.property()

});
