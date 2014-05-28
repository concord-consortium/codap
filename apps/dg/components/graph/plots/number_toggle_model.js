// ==========================================================================
//                          DG.NumberToggleModel
//
//  Author:   William Finzer
//
//  Copyright (c) 2014 by The Concord Consortium, Inc. All rights reserved.
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

/** @class DG.NumberToggleModel - The model for the parent cases that are available for toggling hide and show.

  @extends SC.Object
*/
DG.NumberToggleModel = SC.Object.extend(
/** @scope DG.NumberToggleModel.prototype */ 
{
  /**
    Assigned by the graph model that owns me.
    @property { DG.GraphDataConfiguration }
  */
  dataConfiguration: null,

  _cachedCaseCount: null,
  _cachedParentCases: null,

  /**
   * @property{SC.Array of DG.Case}
   */
  parentCases: function() {
    var tParents = [],
        tCases = this.getPath('dataConfiguration.allCases' );
    if( !tCases)
      return [];
    tCases = tCases.flatten();
    // This check for whether we can use the cached parents isn't completely foolproof because
    // cases could come and go leaving us with the same number between calls.
    if( tCases.length === this._cachedCaseCount) {
      tParents = this._cachedParentCases;
    }
    else {
      tCases.forEach( function( iCase) {
        var tParent = iCase.get('parent');
        if( tParent && tParents.indexOf( tParent ) < 0 ) {
          tParents.push( tParent );
        }
      });
      this._cachedCaseCount = tCases.length;
      this._cachedParentCases = tParents;
    }
    return tParents;
  }.property('*dataConfiguration.cases'),

  /**
   * @property {Number}
   */
  numberOfParents: function() {
    return this.get('parentCases' ).length;
  }.property('parentCases'),

  /**
   * We assume that there is only one parent collection and that it doesn't matter which case we use to get the name.
   * @property {String}
   */
  nameOfParentCollection: function() {
    var tName = '';
    if( this.get('numberOfParents') > 0) {
      tName = this.get('parentCases')[ 0].getPath('collection.name');
    }
    return tName;
  }.property(),

  /**
   * Return the children of the parent with the given index.
   *
   * @param iIndex {Number}
   * @return {Array} of DG.Case
   */
  childrenOfParent: function( iIndex) {
    var tParents = this.get('parentCases' ),
        tParent = (iIndex < tParents.length) ? tParents[ iIndex] : null;
    return tParent ? tParent.get('children' ).flatten() : [];
  },

  /**
   * If any cases are visible, hide them. Otherwise show all cases
   *
   */
  changeAllCaseVisibility: function() {
    var tConfig = this.get('dataConfiguration' ) /*,
        tVisibleCases = tConfig.get('cases') */;
//    if( tVisibleCases.length > 0) {
//      tConfig.hideCases( tVisibleCases);
//    }
//    else {
      tConfig.showAllCases();
//    }
  },

  /**
   * If any cases that are children of the parent with the given index are visible, hide them.
   * Otherwise, unhide all cases that are children of the parent with the given index.
   *
   * @param iIndex {Number}
   */
//  toggleChildrenVisibility: function( iIndex) {
//    var tChildren = this.childrenOfParent( iIndex ),
//        tConfig = this.get('dataConfiguration'),
//        tHidden = tConfig ? tConfig.get('hiddenCases' ) : [];
//
//    function isVisible( iCase) {
//      return tHidden.indexOf( iCase) < 0;
//    }
//
//    if( tChildren.some( isVisible)) {
//      tConfig.hideCases( tChildren);
//    }
//    else {
//      tConfig.showCases( tChildren);
//    }
//  },

  /**
   * Show all children of parent corresponding to given index. Hide all other cases.
   *
   * @param iIndex {Number}
   */
  toggleChildrenVisibility: function( iIndex) {
    var tChildren = this.childrenOfParent( iIndex ),
        tConfig = this.get('dataConfiguration' ),
        tVisibleCases = tConfig.get('cases');
    tConfig.hideCases( tVisibleCases);
    tConfig.showCases( tChildren);
  },

  /**
   *
   * @param iIndex
   * @return {Boolean}
   */
  allChildrenAreHidden: function( iIndex) {
    var tChildren = this.childrenOfParent( iIndex ),
        tHidden = this.getPath('dataConfiguration.hiddenCases' );

    function isVisible( iCase) {
      return tHidden.indexOf( iCase) < 0;
    }

    return !tChildren.some( isVisible);
  },

  /**
   *
   * Note: returns true if no cases are hidden when there are no cases
   * @param iIndex
   * @return {Boolean}
   */
  allCasesAreHidden: function() {
    return this.get('dataConfiguration' ).getCaseCount() === 0;
  },

  /**
   * When the data context changes we notify
   */
  handleDataContextNotification: function( iNotifier) {
    this.invokeOnceLater( this.propertyDidChange, 300, 'caseCount');
  }

});

