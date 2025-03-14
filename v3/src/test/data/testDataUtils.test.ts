/**
 * Tests for Test Data Utilities
 */

import {
  createTestCase,
  createTestCases,
  createAttributeDefinition,
  createCollectionDefinition,
  createSampleDatasetStructure,
  createHierarchicalData,
  createSampleHierarchicalData
} from './testDataUtils';

describe('Test Data Utilities', () => {
  describe('createTestCase', () => {
    it('should create a case with the given values', () => {
      const values = { attr1: 'value1', attr2: 42 };
      const caseObj = createTestCase(values);
      
      expect(caseObj).toHaveProperty('__id__');
      expect(caseObj.attr1).toBe('value1');
      expect(caseObj.attr2).toBe(42);
    });
    
    it('should use the provided ID if given', () => {
      const values = { attr1: 'value1' };
      const caseObj = createTestCase(values, 'test-id');
      
      expect(caseObj.__id__).toBe('test-id');
    });
  });
  
  describe('createTestCases', () => {
    it('should create the specified number of cases', () => {
      const cases = createTestCases(5, i => ({ value: i }));
      
      expect(cases).toHaveLength(5);
      expect(cases[0].value).toBe(0);
      expect(cases[4].value).toBe(4);
    });
    
    it('should use sequential IDs with the given prefix', () => {
      const cases = createTestCases(3, i => ({ value: i }), 'test_');
      
      expect(cases[0].__id__).toBe('test_1');
      expect(cases[1].__id__).toBe('test_2');
      expect(cases[2].__id__).toBe('test_3');
    });
  });
  
  describe('createAttributeDefinition', () => {
    it('should create an attribute definition with the given properties', () => {
      const attr = createAttributeDefinition('attr1', 'Attribute 1', 'categorical');
      
      expect(attr.id).toBe('attr1');
      expect(attr.name).toBe('Attribute 1');
      expect(attr.type).toBe('categorical');
    });
    
    it('should default to numeric type if not specified', () => {
      const attr = createAttributeDefinition('attr1', 'Attribute 1');
      
      expect(attr.type).toBe('numeric');
    });
  });
  
  describe('createCollectionDefinition', () => {
    it('should create a collection definition with the given properties', () => {
      const collection = createCollectionDefinition('coll1', 'Collection 1', ['attr1', 'attr2']);
      
      expect(collection.id).toBe('coll1');
      expect(collection.name).toBe('Collection 1');
      expect(collection.attributeIds).toEqual(['attr1', 'attr2']);
    });
    
    it('should default to empty attribute IDs if not specified', () => {
      const collection = createCollectionDefinition('coll1', 'Collection 1');
      
      expect(collection.attributeIds).toEqual([]);
    });
  });
  
  describe('createSampleDatasetStructure', () => {
    it('should create a sample dataset with default options', () => {
      const dataset = createSampleDatasetStructure();
      
      expect(dataset.attributes.length).toBeGreaterThan(0);
      expect(dataset.collections.length).toBe(1);
      expect(dataset.cases.length).toBe(10);
    });
    
    it('should respect the numCases option', () => {
      const dataset = createSampleDatasetStructure({ numCases: 5 });
      
      expect(dataset.cases.length).toBe(5);
    });
    
    it('should include only numeric attributes when specified', () => {
      const dataset = createSampleDatasetStructure({
        includeNumeric: true,
        includeCategorial: false,
        includeDateTime: false
      });
      
      expect(dataset.attributes.every(attr => attr.type === 'numeric')).toBe(true);
    });
    
    it('should include only categorical attributes when specified', () => {
      const dataset = createSampleDatasetStructure({
        includeNumeric: false,
        includeCategorial: true,
        includeDateTime: false
      });
      
      expect(dataset.attributes.every(attr => attr.type === 'categorical')).toBe(true);
    });
  });
  
  describe('createHierarchicalData', () => {
    it('should create a hierarchical structure with the specified depth and children', () => {
      const data = createHierarchicalData(2, 2);
      
      expect(data.id).toBe('root');
      expect(data.children.length).toBe(2);
      expect(data.children[0].children.length).toBe(2);
      expect(data.children[0].children[0].children.length).toBe(0); // Depth 2 has no children
    });
  });
  
  describe('createSampleHierarchicalData', () => {
    it('should create a sample hierarchical structure', () => {
      const data = createSampleHierarchicalData();
      
      expect(data.id).toBe('root');
      expect(data.children.length).toBe(2);
      expect(data.children[0].id).toBe('group1');
      expect(data.children[0].children.length).toBe(2);
      expect(data.children[1].id).toBe('group2');
      expect(data.children[1].children.length).toBe(2);
    });
  });
}); 