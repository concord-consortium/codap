import { 
  createTestDataset, 
  emptyDataset, 
  numericDataset, 
  mixedTypeDataset, 
  largeDataset, 
  datasetWithMissingValues 
} from './datasets';

describe('Dataset Fixtures', () => {
  describe('createTestDataset', () => {
    it('creates a dataset with the specified ID and name', () => {
      const dataset = createTestDataset('test-id', 'Test Name');
      expect(dataset.id).toBe('test-id');
      expect(dataset.name).toBe('Test Name');
    });

    it('creates a dataset with attributes', () => {
      const dataset = createTestDataset('test-id', 'Test Name', [
        { id: 'attr1', name: 'Attribute 1' },
        { id: 'attr2', name: 'Attribute 2' }
      ]);
      
      expect(dataset.attributes.length).toBe(2);
      expect(dataset.attributes[0].id).toBe('attr1');
      expect(dataset.attributes[0].name).toBe('Attribute 1');
      expect(dataset.attributes[1].id).toBe('attr2');
      expect(dataset.attributes[1].name).toBe('Attribute 2');
    });

    it('creates a dataset with cases', () => {
      const dataset = createTestDataset(
        'test-id', 
        'Test Name', 
        [
          { id: 'x', name: 'X' },
          { id: 'y', name: 'Y' }
        ],
        [
          { x: 1, y: 10 },
          { x: 2, y: 20 }
        ]
      );
      
      expect(dataset._itemIds.length).toBe(2);
      
      // Check first case values
      const case1 = dataset.getItemAtIndex(0);
      expect(case1).toBeDefined();
      expect(dataset.getValue(case1!.__id__, 'x')).toBe(1);
      expect(dataset.getValue(case1!.__id__, 'y')).toBe(10);
      
      // Check second case values
      const case2 = dataset.getItemAtIndex(1);
      expect(case2).toBeDefined();
      expect(dataset.getValue(case2!.__id__, 'x')).toBe(2);
      expect(dataset.getValue(case2!.__id__, 'y')).toBe(20);
    });
  });

  describe('Predefined datasets', () => {
    it('creates an empty dataset', () => {
      const dataset = emptyDataset();
      expect(dataset.id).toBe('empty-dataset');
      expect(dataset.name).toBe('Empty Dataset');
      expect(dataset.attributes.length).toBe(0);
      expect(dataset._itemIds.length).toBe(0);
    });

    it('creates a numeric dataset', () => {
      const dataset = numericDataset();
      expect(dataset.id).toBe('numeric-dataset');
      expect(dataset.attributes.length).toBe(2);
      expect(dataset._itemIds.length).toBe(3);
      
      // Check attribute names
      expect(dataset.attributes[0].name).toBe('X');
      expect(dataset.attributes[1].name).toBe('Y');
      
      // Check case values
      const case1 = dataset.getItemAtIndex(0);
      expect(dataset.getValue(case1!.__id__, 'x')).toBe(1);
      expect(dataset.getValue(case1!.__id__, 'y')).toBe(10);
    });

    it('creates a mixed type dataset', () => {
      const dataset = mixedTypeDataset();
      expect(dataset.id).toBe('mixed-dataset');
      expect(dataset.attributes.length).toBe(4);
      expect(dataset._itemIds.length).toBe(3);
    });

    it('creates a large dataset', () => {
      const dataset = largeDataset();
      expect(dataset.id).toBe('large-dataset');
      expect(dataset.attributes.length).toBe(4);
      expect(dataset._itemIds.length).toBe(1000);
    });

    it('creates a dataset with missing values', () => {
      const dataset = datasetWithMissingValues();
      expect(dataset.id).toBe('missing-values-dataset');
      expect(dataset.attributes.length).toBe(3);
      expect(dataset._itemIds.length).toBe(4);
      
      // Check for missing values
      const case2 = dataset.getItemAtIndex(1);
      expect(dataset.getValue(case2!.__id__, 'a')).toBe(4);
      expect(dataset.getValue(case2!.__id__, 'b')).toBe(''); // Empty string for missing values
      expect(dataset.getValue(case2!.__id__, 'c')).toBe(6);
    });
  });
}); 