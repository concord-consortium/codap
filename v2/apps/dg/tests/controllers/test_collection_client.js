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
    tCollectionModel = DG.Collection.create({
      context: tContext,
      collectionRecord: tCollectionRecord
    }),
    tClient,
    tIDs,tNames, cases = [];
  tCollectionModel.createAttribute({ name: 'first' });
  tCollectionModel.createAttribute({ name: 'second' });
  tCollectionModel.createAttribute({ name: 'hidden', 'hidden':true });
  cases.push(tCollectionModel.createCase({values: {first: '1', second: 'a'}}));
  cases.push(tCollectionModel.createCase({values: {first: '2', second: 'b'}}));
  tClient = DG.CollectionClient.create({});
  ok(tClient, 'Can create CollectionClient');
  tClient.setTargetCollection(tCollectionModel);
  tIDs = tClient.getAttributeIDs();
  equals(tIDs.length, 3, 'Can get attribute IDs');
  tNames = tClient.getAttributeNames();
  equals(tNames.length, 3, 'Can get attribute names');
  // hidden attributes should be excluded from getVisibleAttributeNames() result:
  equals(tClient.getVisibleAttributeNames().length, 2, 'Can get visible attribute names');
  ok(tNames[0] === 'first' && tNames[1] === 'second', 'Attribute names match.');
  tIDs = tClient.getCaseIDs();
  equals(tIDs.length, 2, 'Can get case IDs');
  equals(tClient.getCaseCount(), 2, 'Can get count.');
  // tClient.deleteCase(cases[0]);
  // equals(tClient.getCaseCount(), 1, 'Deleting a case reduces count.');
  cases = tClient.getPath('casesController.arrangedObjects');
  equals(cases.length(), 2, 'Can get cases as arranged objects');

});
