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
DG.NumberToggleModel = SC.Object.extend( (function() {
/** @scope DG.NumberToggleModel.prototype */

  function reduceCase(prevCases, newCase) {
    prevCases.push(newCase);
    return prevCases;
  }

  function hideShowCases(iConfig, iCases, iShow) {
    var casesToHideShow = [];
    iCases.reduce(reduceCase, casesToHideShow);

    // recursively hide/show children
    iCases.forEach(function(iCase) {
      var tChildren = iCase.get('children');
      if (tChildren && tChildren.length)
        tChildren.reduce(reduceCase, casesToHideShow);
    });

    if (iShow)
      iConfig.showCases(casesToHideShow);
    else
      iConfig.hideCases(casesToHideShow);
  }

return {
  /**
    Assigned by the graph model that owns me.
    @property { DG.GraphDataConfiguration }
  */
  dataConfiguration: null,

  hiddenCasesBinding: '*dataConfiguration.hiddenCases',

  /**
   * Whether we are in show last parent case only mode
   * @property {Boolean}
   */
  lastMode: false,

  _cachedCaseCount: null,
  _cachedParentCases: null,

  /**
   * @property{SC.Array of DG.Case}
   */
  parentCases: function() {
    var tParents = [],
        tCases = this.getPath('dataConfiguration.allCases' ),
        isHierarchical = false;
    if( !tCases)
      return [];
    tCases = tCases.flatten();

    function getUltimateParent(iCase) {
      var lastCase;
      while(iCase) {
        lastCase = iCase;
        iCase = iCase.get('parent');
        if (iCase) isHierarchical = true;
      }
      return lastCase;
    }

    // This check for whether we can use the cached parents isn't completely foolproof because
    // cases could come and go leaving us with the same number between calls.
    if( tCases.length === this._cachedCaseCount) {
      tParents = this._cachedParentCases;
    }
    else {
      tCases.forEach( function( iCase) {
        var tParent = getUltimateParent(iCase);
        if( tParent && tParents.indexOf( tParent ) < 0 ) {
          tParents.push( tParent );
        }
      });
      this._cachedCaseCount = tCases.length;
      this._cachedParentCases = tParents;
      this._isHierarchical = isHierarchical;
    }
    return tParents;
  }.property(),
  parentCasesDidChange: function() {
    this.notifyPropertyChange('parentCases');
  }.observes('*dataConfiguration.cases'),

  getParentCollection: function() {
    return this.get('numberOfParents') > 0
              ? this.get('parentCases')[0].get('collection')
              : null;
  },

  getFirstParentAttribute: function() {
    var collection = this.getParentCollection(),
        attrs = collection && collection.get('attrs'),
        attr = attrs && attrs[0];
    return attr;
  },

  getParentLabel: function(iIndex) {
    var cases = this.get('parentCases'),
        tCase = cases && cases[iIndex],
        attr = this.getFirstParentAttribute(),
        caseAttrValue = tCase && attr && tCase.getStrValue(attr.get('id'));
    return !SC.empty(caseAttrValue) ? caseAttrValue : (iIndex + 1).toString();
  },

  getParentTooltip: function(iIndex) {
    return SC.String.loc('DG.NumberToggleView.indexTooltip');
  },

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
   * True if cases have parents
   * @property{Integer}
   */
  indicesRepresentChildren: function() {
    this.get('parentCases');
    return this._isHierarchical;
  }.property('numberOfParents'),

  /**
   * Return the number of indices that should be displayed
   * @property{Integer}
   */
  numberOfToggleIndices: function() {
    var dataConfiguration = this.get('dataConfiguration'),
      allCases = (dataConfiguration && dataConfiguration.get('allCases')),
      allCasesLength = allCases? allCases.length(): 0;
    if( this.get('indicesRepresentChildren'))
      return this.get('numberOfParents');
    else // There are no parents, so each case gets an index
      return allCasesLength;
  }.property(),
  numberOfToggleIndicesDidChange: function() {
    this.notifyPropertyChange('numberOfToggleIndices');
  }.observes('*dataConfiguration.allCases'),

  /**
   * Return the children of the parent with the given index.
   *
   * @param iIndex {Number}
   * @return {Array} of DG.Case
   */
  childrenOfParent: function( iIndex) {
    var tParents = this.get('parentCases' ),
        tParent = (iIndex < tParents.length) ? tParents[ iIndex] : null,
        tChildren = tParent ? tParent.get('children') : [];
    for (var i = 0; i < tChildren.get('length'); ++i) {
      var child = tChildren.objectAt(i),
          descendants = child.get('children');
      if (descendants && descendants.get('length')) {
        descendants.forEach(function(iCase) {
          tChildren.push(iCase);
        });
      }
    }
    return tChildren;
  },

  /**
   * @return{Boolean}
   */
  allCasesAreVisible: function() {
    var hiddenCases = this.get('hiddenCases');
    return !hiddenCases || !hiddenCases.length;
  },

  /*
   * For tracking whether we are in the process of making visibility changes.
   * Allows differential response to visibility changes caused by others.
   */
  _isChangingVisibility: 0,

  beginVisibilityChanges: function() {
    ++ this._isChangingVisibility;
  },

  endVisibilityChanges: function() {
    // use invokeLater() so notifications have a chance to propagate
    this.invokeLater(function() {
      -- this._isChangingVisibility;
    }.bind(this));
  },

  isChangingVisibility: function() {
    return this._isChangingVisibility > 0;
  },

  /**
   * If any cases are hidden, show them. Otherwise hide all cases
   *
   */
  changeAllCaseVisibility: function() {
    var tConfig = this.get('dataConfiguration' );
    this.beginVisibilityChanges();
    if( this.allCasesAreVisible()) {
      hideShowCases(tConfig, tConfig.get('cases'), false);
    }
    else {
      hideShowCases(tConfig, tConfig.get('hiddenCases'), true);
    }
    this.endVisibilityChanges();
  },

  getCasesForIndex: function(iIndex) {
    var tConfig = this.get('dataConfiguration'),
        tResultCases;

    if (this.get('indicesRepresentChildren')) {
      tResultCases = this.childrenOfParent(iIndex);
    }
    else {
      var tAllCases = tConfig ? tConfig.get('allCases') : [],
          tCases = tAllCases ? tAllCases.flatten() : [],
          tCase = (tCases.length > iIndex) ? tCases[iIndex] : null;
      tResultCases = tCase ? [tCase] : null;
    }
    return tResultCases;
  },

  /**
   * If any cases that are children of the parent with the given index are visible, hide them.
   * Otherwise, unhide all cases that are children of the parent with the given index.
   *
   * @param iIndex {Number}
   */
  toggleChildrenVisibility: function( iIndex) {
    var tChildren = this.childrenOfParent( iIndex ),
        tConfig = this.get('dataConfiguration');

    this.beginVisibilityChanges();
    hideShowCases(tConfig, tChildren, this.allChildrenAreHidden(iIndex));
    this.endVisibilityChanges();
  },

  /**
   * Whether we toggle visibility of children or a single parent depends what the indices represent
   * @param iIndex
   */
  toggleVisibility: function( iIndex) {
    if( this.get('indicesRepresentChildren')) {
      this.toggleChildrenVisibility( iIndex);
    }
    else {
      var tConfig = this.get('dataConfiguration'),
          tCases = tConfig ? tConfig.get('allCases').flatten() : [],
          tHidden = tConfig ? tConfig.get('hiddenCases' ) : [],
          tCase = (tCases.length > iIndex) ? tCases[ iIndex] : null;
      this.beginVisibilityChanges();
      hideShowCases(tConfig, [tCase], tHidden.indexOf(tCase) >= 0);
      this.endVisibilityChanges();
    }
  },

  /**
   * Hide/show the children of the specified parent case
   * @param {Number}  iIndex - parent case index
   * @param {Boolean} iVisible - true to show; false to hide
   */
  setVisibility: function(iIndex, iVisible) {
    var tConfig = this.get('dataConfiguration'),
        tCasesToHideShow = this.getCasesForIndex(iIndex);

    if (tCasesToHideShow) {
      this.beginVisibilityChanges();
      hideShowCases(tConfig, tCasesToHideShow, iVisible);
      this.endVisibilityChanges();
    }
  },

  /**
   * Observer function for 'lastMode' changes
   * Enabling 'lastMode' hides all but the last parent case.
   * Disabling 'lastMode' exits the mode but doesn't change case visibility.
   */
  lastModeDidChange: function() {
    var lastMode = this.get('lastMode');
    if (lastMode) {
      this.showOnlyLastParentCase();
    }
  }.observes('lastMode'),

  /**
   * Show the last parent case and hide all the other parent cases.
   */
  showOnlyLastParentCase: function() {
    var toggleIndex, toggleCount = this.get('numberOfToggleIndices'),
        casesToHide = [], toggleCases;

    this.beginVisibilityChanges();

    // accumulate cases to hide so they can be hidden all at once
    for (toggleIndex = 0; toggleIndex < toggleCount - 1; ++toggleIndex) {
      toggleCases = this.getCasesForIndex(toggleIndex);
      // append toggleCases to casesToHide without duplicating any arrays
      toggleCases.reduce(reduceCase, casesToHide);
    }
    // hide all cases in one fell swoop
    if (casesToHide && casesToHide.length)
      hideShowCases(this.get('dataConfiguration'), casesToHide, false);
    // show the last parent case
    this.setVisibility(toggleIndex, true);

    this.endVisibilityChanges();
  },

  /**
   *
   * @param iIndex
   * @return {Boolean}
   */
  allChildrenAreHidden: function( iIndex) {
    var tChildren = this.childrenOfParent( iIndex ),
        tPlotted = this.getPath('dataConfiguration.cases'),
        tHidden = this.get('hiddenCases'),
        tPlottedMap = {},
        tHiddenMap = {};

    // Note: Ideally, these maps should be cached, as they're currently being created for
    // each parent case independently, but figuring out the right time to invalidate the
    // caches is non-trivial, and so is left as a potential future optimization.

    // id map of all plotted cases (does not include cases not plotted due to missing values)
    (tPlotted || []).forEach(function(iCase) { tPlottedMap[iCase.get('id')] = true; });
    // id map of all hidden cases
    (tHidden || []).forEach(function(iCase) {
      if(iCase)
        tHiddenMap[iCase.get('id')] = true;
    });

    return !tChildren.some(function(iCase) {
                            var caseID = iCase.get('id');
                            // to be visible cases must be plotted and not hidden
                            return tPlottedMap[caseID] && !tHiddenMap[caseID];
                          });
  },

  /**
   * Depends on what indices represent
   * @param iIndex
   * @return {Boolean}
   */
  casesForIndexAreHidden: function( iIndex) {
    if( this.get('indicesRepresentChildren')) {
      return this.allChildrenAreHidden( iIndex);
    }
    else {
      var tConfig = this.get('dataConfiguration'),
          tCases = tConfig ? tConfig.get('allCases').flatten() : [],
          tHidden = tConfig ? tConfig.get('hiddenCases' ) : [],
          tCase = (tCases.length > iIndex) ? tCases[ iIndex] : null;
      return( tHidden.indexOf( tCase) >= 0);
    }
  },

  /**
   * Note: returns true if no cases are hidden when there are no cases
   * @return {Boolean}
   */
  allCasesAreHidden: function() {
    return this.get('dataConfiguration' ).getCaseCount() === 0;
  },

  /**
   * Respond to shown/hidden cases
   */
  hiddenCasesDidChange: function() {
    // if user hides/shows cases via other means, exit lastMode
    if (this.get('lastMode') && !this.isChangingVisibility())
      this.set('lastMode', false);
  }.observes('hiddenCases'),

  /**
   * When the data context changes we notify
   */
  handleDataContextNotification: function(iNotifier, iChange) {
    if (this.get('isEnabled')) {
      // if cases are created while in lastMode, ensure only last parent is visible
      if (this.get('lastMode') && (iChange.operation.indexOf('createCase') === 0)) {
        this.invokeOnce(function() { this.showOnlyLastParentCase(); }.bind(this));
        return;
      }

      if (['createCollection', 'deleteCollection', 'moveAttribute'].indexOf(iChange.operation) >= 0) {
        this._cachedCaseCount = this._cachedParentCases = this._isHierarchical = null;
      }

      // 'caseCount' is used as a proxy to indicate that some change occurred
      // GraphView.handleNumberToggleDidChange() observes 'caseCount'
      // not clear why invokeOnceLater() is (or was) required
      this.invokeOnceLater( this.propertyDidChange, 1, 'caseCount');
    }
  }

};

})());
