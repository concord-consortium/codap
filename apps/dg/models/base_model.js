/**
 * Created by jsandoe on 10/29/14.
 */
/** @class

  A controller object for the cases and attributes that make up a collection.

 @extends SC.Object
 */
DG.BaseModel = SC.Object.extend(
  /** @scope DG.BaseModel.prototype */ {
    recordType: function() {
      // Record type should be the constructor function
      return this.constructor;
    }.property().cacheable(),

    init: function () {
      if (!SC.empty(DG.store)) {
        DG.store.register(this.recordType(), this);
      }
      this.verify();
    },

    destroy: function () {
      DG.store.deregister(this.id);
    },

    toLink: function() {
      var recordType = this.get('recordType');
      return { type: recordType, id: this.get('id') };
    },
    /**
     Update any properties that need to be updated pre-archive, e.g. layout.

     In general when overriding, call sc_super(), and then do your own thing.

     @function
     */
    willSaveRecord: function() {
    },

    /**
     Restore any properties that need to be updated post-archive, e.g. layout.

     */
    didLoadRecord: function() {
    },

    /*
     * Allows for verification of the initial construction of an object.
     * Verifiers should log to the console, in the case of missing mandatory
     * properties or inconsistencies.
     */
    verify: function () { }
  });
