// ==========================================================================
//                            DG.DataDisplayModel
//
//  Author:   William Finzer
//
//  Copyright ©2014 Concord Consortium
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

sc_require('alpha/destroyable');

/** @class  DG.DataDisplayModel - The model for a for use in a display situation such as a graph or map.

 @extends SC.Object
 */
DG.DataDisplayModel = SC.Object.extend( DG.Destroyable,
  /** @scope DG.DataDisplayModel.prototype */
  {
    autoDestroyProperties: [ 'dataConfiguration', 'legend' ],

    /**
     @property { DG.LegendModel }
     */
    legend: null,

    /**
     @property { DG.GraphDataConfiguration }
     */
    dataConfiguration: null,

    /**
      @property { DG.CollectionClient }
    */
    collectionClient: null,
    collectionClientBinding: '*dataConfiguration.collectionClient',

    /**
      The plot model needs access to the cases controller that is stored in my dataConfiguration's
        collection client.
      @property { SC.ArrayController }
    */
    casesController: null,
    casesControllerBinding: '*dataConfiguration.collectionClient.casesController',

    /**
     * @property {Array} of DG.Case
     */
    cases: null,
    casesBinding: '*dataConfiguration.cases',

    /**
      @property { SC.SelectionSet }
    */
    selection: function() {
      return this.getPath('dataConfiguration.selection');
    }.property('dataConfiguration.selection'),

    /**
     Work around current notification bug whereby we get notified that number of cases has
     changed even when it hasn't.
     @property {Number}
     */
    _oldNumberOfCases: 0,

    /**
     Prepare dependencies.
     */
    init: function() {
      var tLegendDescription;

      sc_super();

      this.set( 'dataConfiguration', this.get('dataConfigurationClass').create() );

      tLegendDescription = this.dataConfiguration.get('legendAttributeDescription');

      this.set('legend', DG.LegendModel.create());
      this.setPath('legend.attributeDescription', tLegendDescription);
    },

    destroy: function() {
      if( this._dataContext)
         this._dataContext.removeObserver('changeCount', this, 'handleDataContextNotification');
      sc_super();
    },

    /**
      The data context for the graph. Set by caller after construction initially and
      reset for graphs restored from document to point to the restored data context.
      @property   {DG.DataContext}
     */
    _dataContext: null,
    dataContext: function( iKey, iValue) {
      // We use a computed property so that we can add/remove observers when necessary.
      if( iValue) {
        if( iValue !== this._dataContext) {
          if( this._dataContext){
             this._dataContext.removeObserver('changeCount', this, 'handleDataContextNotification');
          }
          this._dataContext = iValue;
          if( this._dataContext) {
            this._dataContext.addObserver('changeCount', this, 'handleDataContextNotification');
          }
        }
        return this;
      }
      return this._dataContext;
    }.property(),

    /**
      Called when the 'dataContext' property is changed.
     */
    dataContextDidChange: function() {
      var dataConfiguration = this.get('dataConfiguration');
      if( dataConfiguration)
        dataConfiguration.set('dataContext', this.get('dataContext'));
    }.observes('dataContext'),

    /**
      Delete the currently selected cases.
      Passes the request on to the data context to do the heavy lifting.
     */
    deleteSelectedCases: function() {
      var tChange = {
            operation: 'deleteCases',
            cases: DG.copy( this.get('selection'))
          };
      this.get('dataContext').applyChange( tChange);
    },

    /**
      Select/deselect all of the points in all the plots.
      @param  {Boolean}   iSelect -- True to select all points, false to deselect all.
                                      Defaults to true (select all) if undefined/null.
     */
    selectAll: function( iSelect) {
      var tSelect = SC.none( iSelect) ? true : !!iSelect,
          tCases = tSelect ? this.get('cases') : null,  // null means all cases, even hidden ones
          tChange = {
            operation: 'selectCases',
            collection: this.get('collectionClient'),
            cases: tCases,
            select: tSelect
          };
      this.get('dataContext').applyChange( tChange);
      DG.logUser( iSelect ? "selectAll" : "deselectAll");
    },

    /**
     * Utility function for use by subclasses.
     * @param iStorage
     * @param iCollLinkName
     * @param iAttrLinkName
     * @returns {*}
     */
    instantiateAttributeRefFromStorage: function( iStorage, iCollLinkName, iAttrLinkName) {
      var kNullResult = { collection: null, attributes: [] },
          tDataContext = this.getPath('dataConfiguration.dataContext');
      if( SC.empty( iCollLinkName) || SC.empty( iAttrLinkName) || !iStorage || !iStorage._links_)
        return kNullResult;

      var collLink = iStorage._links_[ iCollLinkName],
          coll = collLink && collLink.id && tDataContext.getCollectionByID( collLink.id),
          attrs = [],
          tLinkCount = DG.ArchiveUtils.getLinkCount( iStorage, iAttrLinkName ),
          tIndex;
      if( !coll)
        return kNullResult;

      for( tIndex = 0; tIndex < tLinkCount; tIndex++) {
        var tAttr = coll.getAttributeByID( DG.ArchiveUtils.getLinkID( iStorage, iAttrLinkName, tIndex));
        if( tAttr)
          attrs.push(tAttr);
      }
      return { collection: coll, attributes: attrs };
    },

    /**
     * Use the properties of the given object to restore my hidden cases.
     * Subclasses can override but should call sc_super.
     * @param iStorage {Object}
     */
    restoreStorage: function( iStorage) {
      this.get('dataConfiguration').restoreHiddenCases( iStorage.hiddenCases);
    },

    handleOneDataContextChange: function( iNotifier, iChange) {
    },

    /**
      Returns an array of indices corresponding to the indices
      of the cases affected by the specified change.
     */
    buildIndices: function( iChange) {
      var srcCases = this.getPath('dataConfiguration.cases');
      if( (iChange.operation === 'updateCases') &&
          srcCases && !SC.none( iChange.cases) &&
          !this.getPath('dataConfiguration.hasAggregates')) {
        var updatedCasesByID = {},
            indices = SC.IndexSet.create();
        // Build a map of IDs for affected cases
        iChange.cases.forEach( function( iCase) {
                                updatedCasesByID[ iCase.get('id')] = iCase;
                               });
        // Loop through source cases to determine indices for the affected cases
        srcCases.forEach( function( iCase, iIndex) {
                            var caseID = iCase.get('id');
                            if( updatedCasesByID[ caseID])
                              indices.add( iIndex);
                          });
        return indices;
      }
      return SC.IndexSet.create( 0, this.getPath('dataConfiguration.cases.length'));
    },

    /**
      Responder for notifications from the DataContext.
     */
    handleDataContextNotification: function( iNotifier) {
      var newChanges = iNotifier.get('newChanges' ),
          tNumChanges = newChanges.length,
          i;
      for( i = 0; i < tNumChanges; i++) {
        this.handleOneDataContextChange( iNotifier, newChanges[ i]);
      }
    },

    /** create a menu item that removes the attribute on the given axis/legend */
    createRemoveAttributeMenuItem: function( iXYorLegend, isForSubmenu, iAttrIndex ) {
      iAttrIndex = iAttrIndex || 0;
      var tDescKey = iXYorLegend + 'AttributeDescription',
          tAxisKey = iXYorLegend + 'Axis', // not used by removeLegendAttribute()
          tAttributes = this.getPath( 'dataConfiguration.' + tDescKey + '.attributes'),
          tAttribute = (SC.isArray( tAttributes) && iAttrIndex < tAttributes.length) ?
              tAttributes[ iAttrIndex] : DG.Analysis.kNullAttribute,
          tName = (tAttribute === DG.Analysis.kNullAttribute) ? '' : tAttribute.get( 'name'),
          tResourceName = isForSubmenu ? 'attribute_' : 'removeAttribute_',
          tTitle = ('DG.DataDisplayMenu.' + tResourceName + iXYorLegend).loc( tName ),
          tAction = ((iXYorLegend==='x'||iXYorLegend==='y') ? this.removeAttribute : this.removeLegendAttribute );
      return {
        title: tTitle,
        target: this,
        itemAction: tAction,
        isEnabled: (tAttribute !== DG.Analysis.kNullAttribute),
        args: [ tDescKey, tAxisKey, iAttrIndex ] };
    },

    /** create a menu item that changes the attribute type on the given axis/legend */
    createChangeAttributeTypeMenuItem: function( iXYorLegend ) {
      var tDescKey = iXYorLegend + 'AttributeDescription',
          tAxisKey = iXYorLegend + 'Axis',
          tDescription = this.getPath( 'dataConfiguration.' + tDescKey),
          tAttribute = tDescription && tDescription.get( 'attribute'),
          tIsNumeric = tDescription && tDescription.get( 'isNumeric'),
          tTitle =( tIsNumeric ? 'DG.DataDisplayMenu.treatAsCategorical' : 'DG.DataDisplayMenu.treatAsNumeric').loc();
      return {
        title: tTitle,
        target: this,
        itemAction: this.changeAttributeType, // call with args, toggling 'numeric' setting
        isEnabled: (tAttribute !== DG.Analysis.kNullAttribute),
        args: [ tDescKey, tAxisKey, !tIsNumeric ] };
    },

    /**
     * Removing the attribute is just changing with null arguments
     */
    removeLegendAttribute: function() {
      this.changeAttributeForLegend( null, null);
    },

    /**
     Sets the attribute for the legend.
     @param  {DG.DataContext}      iDataContext -- The data context for this graph
     @param  {Object}              iAttrRefs -- The attribute to set for the axis
     {DG.CollectionClient} iAttrRefs.collection -- The collection that contains the attribute
     {DG.Attribute}        iAttrRefs.attribute -- Array of attributes to set for the legend
     */
    changeAttributeForLegend: function( iDataContext, iAttrRefs) {
      var tAttribute = iAttrRefs && iAttrRefs.attributes[0];
      if( tAttribute)
        DG.logUser("legendAttributeChange: { to attribute %@ }", tAttribute.get('name'));
      else
        DG.logUser("legendAttributeRemoved:");

      this.set('aboutToChangeConfiguration', true ); // signals dependents to prepare

      var dataConfiguration = this.get('dataConfiguration');
      if( iDataContext)
        dataConfiguration.set('dataContext', iDataContext);
      dataConfiguration.setAttributeAndCollectionClient('legendAttributeDescription', iAttrRefs);

      this.invalidate();
      this.set('aboutToChangeConfiguration', false ); // reset for next time
    },

    /**
     @private
     */
    dataRangeDidChange: function( iSource, iKey, iObject, iIndices) {
      this.invalidate();
    },

    /**
     *
     * @param iChange
     * @param iInvalidateDisplayCaches {Boolean}
     */
    invalidate: function( iChange, iInvalidateDisplayCaches) {
      this.get( 'dataConfiguration' ).invalidateCaches( null, iChange);
    }

  } );

