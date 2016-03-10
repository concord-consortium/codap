// ==========================================================================
//                              DG.ImageView
// 
//  Overrides SC.ImageView to provide some missing behaviors.
//  
//  Authors:  William Finzer
//
//  Copyright (c) 2015 by The Concord Consortium, Inc. All rights reserved.
//
//  Licensed under the Apache License, Version 2.0 (the "License");
//  you may not use this file except in compliance with the License.
//  You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
//  Unless required by applicable law or agreed to in writing, software
//  distributed under the License is distributed on an "AS IS" BASIS,
//  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//  See the License for the specific language governing permissions and
//  limitations under the License.
// ==========================================================================

/** @class

  A TableView contains a scrollable view that, in turn, contains a table.

  @extends SC.ImageView
*/
DG.ImageView = SC.ImageView.extend(
/** @scope DG.ImageView.prototype */ {

  /**
    The alternate text to use for the ALT attribute of the image.
    The ALT attribute specifies alternate text to be used by user agents
    (e.g. browsers, screen readers) that cannot display images.
    @property {String}
   */
  altText: null,
  
  /**
    Set to true to indicate that the 'altText' property should be localized.
    @property {Boolean}
   */
  localize: false,
  
  /**
    [Computed] Returns the string to use for the ALT attribute.
    @returns  {String}  The string to use for the ALT attribute.
   */
  displayAltText: function() {
    var altText = this.get('altText') || this.get('toolTip') || "";
    return !SC.empty( altText) && this.get('localize') ? altText.loc() : altText;
  }.property('altText', 'toolTip', 'localize'),

  /**
    Install the toolTip and alternate text at render time.
    @param {SC.RenderContext} context the render context instance
  */
  render: function(context) {
    sc_super();

    // Alternative text description of image
    var altText = this.get('displayAltText');
    if( !SC.empty( altText))
      context.setAttr('alt', altText);

    // 'displayToolTip' is auto-localized if 'localize' is true
    var toolTip = this.get('displayToolTip');
    if( !SC.empty( toolTip))
      context.setAttr('title', toolTip);
  }
});

