/**
 * Created by jsandoe on 10/31/14.
 */
module("DG.CollectionClient", {
  setup: function () {
    DG.Document.createDocument();
  },
  teardown: function () {
    DG.activeDocument = null;
    DG.store = DG.ModelStore.create();
  }
});
test("test DG.CollectionClient", function () {
  var tProps = {
      name: 'Collection A',
      description: 'A parent collection'
    },
    tContext = DG.activeDocument.createContext({}),
    tCollectionRecord = tContext.createCollection(tProps),
    tCollectionModel = DG.Collection.create({collectionRecord: tCollectionRecord}),
    tClient,
    tIDs,tNames, cases;
  tCollectionModel.createAttribute({ name: 'first' });
  tCollectionModel.createAttribute({ name: 'second' });
  tCollectionModel.createCase({values: {first: '1', second: 'a'}});
  tCollectionModel.createCase({values: {first: '2', second: 'b'}});
  tClient = DG.CollectionClient.create({});
  ok(tClient, 'Can create CollectionClient');
  tClient.setTargetCollection(tCollectionModel);
  tIDs = tClient.getAttributeIDs();
  equals(tIDs.length, 2, 'Can get attribute IDs');
  tNames = tClient.getAttributeNames();
  equals(tNames.length, 2, 'Can get attribute names');
  ok(tNames[0] === 'first' && tNames[1] === 'second', 'Attribute names match.');
  tIDs = tClient.getCaseIDs();
  equals(tIDs.length, 2, 'Can get case IDs');
  cases = tClient.getPath('casesController.arrangedObjects');
  equals(cases.length(), 2, 'Can get cases as arranged objects');

});
