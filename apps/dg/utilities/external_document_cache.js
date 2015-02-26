DG.ExternalDocumentCache = {

  _externalDocumentCache: {},

  /**
    */
  clear: function() {
    this._externalDocumentCache = {};
  },

  cache: function( iDocumentId, iDocumentContent ) {
    this._externalDocumentCache[iDocumentId] = iDocumentContent;
  },

  fetch: function( iDocumentId ) {
    return this._externalDocumentCache[iDocumentId];
  }

};
