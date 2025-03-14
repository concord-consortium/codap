/**
 * Test Data Utilities
 * 
 * This file contains utilities for creating and manipulating test data
 * for use in unit and integration tests.
 */

import { types, Instance, SnapshotIn } from 'mobx-state-tree';
import { ICase } from '../../models/data/data-set-types';
import { DataSet } from '../../models/data/data-set';
import { Attribute } from '../../models/data/attribute';
import { AttributeType } from '../../models/data/attribute-types';
import { CollectionModel } from '../../models/data/collection';

// Define interfaces for our test utilities
interface ITestDataSet extends Instance<typeof DataSet> {}
interface ITestAttribute extends Instance<typeof Attribute> {}
interface ITestCollection extends Instance<typeof CollectionModel> {}

/**
 * Creates a test attribute with the given properties
 * @param name - The name of the attribute
 * @param type - The type of the attribute (defaults to 'numeric')
 * @param options - Additional options for the attribute
 * @returns An attribute instance
 */
export function createTestAttribute(
  name: string,
  type: AttributeType = 'numeric',
  options: Partial<SnapshotIn<typeof Attribute>> = {}
): ITestAttribute {
  return Attribute.create({
    id: options.id || `attr_${name}`,
    name,
    type,
    description: options.description || '',
    formula: options.formula || '',
    precision: options.precision,
    unit: options.unit || '',
    editable: options.editable !== undefined ? options.editable : true,
    hidden: options.hidden || false,
    ...options
  });
}

/**
 * Creates a test collection with the given properties
 * @param name - The name of the collection
 * @param attributes - The attributes to include in the collection
 * @param options - Additional options for the collection
 * @returns A collection instance
 */
export function createTestCollection(
  name: string,
  attributes: ITestAttribute[] = [],
  options: Partial<SnapshotIn<typeof CollectionModel>> = {}
): ITestCollection {
  return CollectionModel.create({
    id: options.id || `collection_${name}`,
    name,
    title: options.title || name,
    description: options.description || '',
    parent: options.parent || '',
    attributes: attributes.reduce((acc, attr) => {
      acc[attr.id] = attr;
      return acc;
    }, {} as Record<string, ITestAttribute>),
    ...options
  });
}

/**
 * Creates a test case with the given values
 * @param values - The values for the case
 * @param id - Optional ID for the case
 * @returns A case object
 */
export function createTestCase(
  values: Record<string, any>,
  id?: string
): ICase {
  return {
    __id__: id || `case_${Math.random().toString(36).substring(2, 11)}`,
    ...values
  };
}

/**
 * Creates a batch of test cases with sequential IDs
 * @param count - Number of cases to create
 * @param valuesFn - Function to generate values for each case
 * @param idPrefix - Prefix for case IDs
 * @returns Array of case objects
 */
export function createTestCases(
  count: number,
  valuesFn: (index: number) => Record<string, any>,
  idPrefix = 'case_'
): ICase[] {
  return Array.from({ length: count }, (_, i) => 
    createTestCase(valuesFn(i), `${idPrefix}${i + 1}`)
  );
}

/**
 * Creates a simple attribute definition for testing
 * @param id - Attribute ID
 * @param name - Attribute name
 * @param type - Attribute type
 * @returns Attribute definition object
 */
export function createAttributeDefinition(
  id: string,
  name: string,
  type: AttributeType = 'numeric'
) {
  return {
    id,
    name,
    type
  };
}

/**
 * Creates a simple collection definition for testing
 * @param id - Collection ID
 * @param name - Collection name
 * @param attributeIds - Array of attribute IDs in this collection
 * @returns Collection definition object
 */
export function createCollectionDefinition(
  id: string,
  name: string,
  attributeIds: string[] = []
) {
  return {
    id,
    name,
    attributeIds
  };
}

/**
 * Creates a sample dataset structure for testing
 * @param options - Configuration options
 * @returns Object with attributes, collections, and cases
 */
export function createSampleDatasetStructure(
  options: {
    numCases?: number;
    includeNumeric?: boolean;
    includeCategorial?: boolean;
    includeDateTime?: boolean;
  } = {}
) {
  const {
    numCases = 10,
    includeNumeric = true,
    includeCategorial = true,
    includeDateTime = true
  } = options;

  // Create attributes
  const attributes: ReturnType<typeof createAttributeDefinition>[] = [];
  
  if (includeNumeric) {
    attributes.push(createAttributeDefinition('attr_value', 'value', 'numeric'));
    attributes.push(createAttributeDefinition('attr_count', 'count', 'numeric'));
  }
  
  if (includeCategorial) {
    attributes.push(createAttributeDefinition('attr_category', 'category', 'categorical'));
    attributes.push(createAttributeDefinition('attr_group', 'group', 'categorical'));
  }
  
  if (includeDateTime) {
    attributes.push(createAttributeDefinition('attr_date', 'date', 'date'));
    attributes.push(createAttributeDefinition('attr_time', 'time', 'numeric'));
  }

  // Create a collection
  const collection = createCollectionDefinition(
    'collection_main',
    'main',
    attributes.map(attr => attr.id)
  );

  // Create cases
  const categories = ['A', 'B', 'C'];
  const groups = ['Group 1', 'Group 2'];
  
  const cases = createTestCases(numCases, (i) => {
    const caseValues: Record<string, any> = {};
    
    if (includeNumeric) {
      caseValues['attr_value'] = Math.round(Math.random() * 100);
      caseValues['attr_count'] = Math.round(Math.random() * 10);
    }
    
    if (includeCategorial) {
      caseValues['attr_category'] = categories[Math.floor(Math.random() * categories.length)];
      caseValues['attr_group'] = groups[Math.floor(Math.random() * groups.length)];
    }
    
    if (includeDateTime) {
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 30));
      caseValues['attr_date'] = date.toISOString().split('T')[0];
      caseValues['attr_time'] = Math.floor(Math.random() * 86400);
    }
    
    return caseValues;
  });

  return {
    attributes,
    collections: [collection],
    cases
  };
}

/**
 * Creates a hierarchical data structure for testing
 * @param depth - Maximum depth of the hierarchy
 * @param childrenPerNode - Number of children per node
 * @returns Hierarchical data structure
 */
export function createHierarchicalData(depth = 3, childrenPerNode = 2) {
  function createNode(id: string, name: string, currentDepth: number): any {
    const node = { id, name, children: [] };
    
    if (currentDepth < depth) {
      for (let i = 0; i < childrenPerNode; i++) {
        const childId = `${id}_child${i + 1}`;
        const childName = `${name} Child ${i + 1}`;
        node.children.push(createNode(childId, childName, currentDepth + 1));
      }
    }
    
    return node;
  }
  
  return createNode('root', 'Root', 0);
}

/**
 * Creates a sample hierarchical dataset for testing
 * @returns A hierarchical data structure
 */
export function createSampleHierarchicalData() {
  return {
    id: 'root',
    name: 'Root',
    children: [
      {
        id: 'group1',
        name: 'Group 1',
        children: [
          { id: 'item1', name: 'Item 1', children: [] },
          { id: 'item2', name: 'Item 2', children: [] }
        ]
      },
      {
        id: 'group2',
        name: 'Group 2',
        children: [
          { id: 'item3', name: 'Item 3', children: [] },
          { id: 'item4', name: 'Item 4', children: [] }
        ]
      }
    ]
  };
}

/**
 * Creates a test dataset with the given collections and cases
 * @param name - The name of the dataset
 * @param collections - The collections to include in the dataset
 * @param cases - The cases to include in the dataset
 * @param options - Additional options for the dataset
 * @returns A dataset instance
 */
export function createTestDataSet(
  name: string,
  collections: ITestCollection[] = [],
  cases: ICase[] = [],
  options: Partial<SnapshotIn<typeof DataSet>> = {}
): ITestDataSet {
  const dataSet = DataSet.create({
    id: options.id || `dataset_${name}`,
    name,
    title: options.title || name,
    description: options.description || '',
    ...options
  });

  // Add collections
  collections.forEach(collection => {
    dataSet.addCollection(collection);
  });

  // Add cases
  if (cases.length > 0) {
    // Check if addCasesWithIDs exists, otherwise use addCases
    if (typeof dataSet.addCasesWithIDs === 'function') {
      dataSet.addCasesWithIDs(cases);
    } else if (typeof dataSet.addCases === 'function') {
      dataSet.addCases(cases);
    }
  }

  return dataSet;
}

/**
 * Creates a sample dataset with predefined structure for testing
 * @param options - Options to customize the sample dataset
 * @returns A dataset instance with sample data
 */
export function createSampleDataSet(
  options: {
    name?: string;
    numCases?: number;
    includeNumeric?: boolean;
    includeCategorial?: boolean;
    includeDateTime?: boolean;
  } = {}
): ITestDataSet {
  const {
    name = 'Sample Dataset',
    numCases = 10,
    includeNumeric = true,
    includeCategorial = true,
    includeDateTime = true
  } = options;

  // Create attributes
  const attributes: ITestAttribute[] = [];
  
  if (includeNumeric) {
    attributes.push(createTestAttribute('value', 'numeric'));
    attributes.push(createTestAttribute('count', 'numeric'));
  }
  
  if (includeCategorial) {
    attributes.push(createTestAttribute('category', 'categorical'));
    attributes.push(createTestAttribute('group', 'categorical'));
  }
  
  if (includeDateTime) {
    attributes.push(createTestAttribute('date', 'date'));
    attributes.push(createTestAttribute('time', 'numeric', { unit: 'seconds' }));
  }

  // Create a collection with these attributes
  const collection = createTestCollection('main', attributes);

  // Create cases
  const cases: ICase[] = [];
  const categories = ['A', 'B', 'C'];
  const groups = ['Group 1', 'Group 2'];
  
  for (let i = 0; i < numCases; i++) {
    const caseValues: Record<string, any> = {};
    
    if (includeNumeric) {
      caseValues['attr_value'] = Math.round(Math.random() * 100);
      caseValues['attr_count'] = Math.round(Math.random() * 10);
    }
    
    if (includeCategorial) {
      caseValues['attr_category'] = categories[Math.floor(Math.random() * categories.length)];
      caseValues['attr_group'] = groups[Math.floor(Math.random() * groups.length)];
    }
    
    if (includeDateTime) {
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 30));
      caseValues['attr_date'] = date.toISOString().split('T')[0];
      caseValues['attr_time'] = Math.floor(Math.random() * 86400);
    }
    
    cases.push(createTestCase(caseValues, `case_${i + 1}`));
  }

  // Create the dataset
  return createTestDataSet(name, [collection], cases);
}

/**
 * A model for creating test hierarchical data
 */
export const HierarchicalTestModel = types
  .model('HierarchicalTestModel', {
    id: types.identifier,
    name: types.string,
    children: types.array(types.late((): any => HierarchicalTestModel))
  })
  .actions(self => ({
    addChild(child: SnapshotIn<typeof HierarchicalTestModel>) {
      self.children.push(child);
    }
  }));

export type IHierarchicalTestModel = Instance<typeof HierarchicalTestModel>;

/**
 * Creates a hierarchical test model with the given structure
 * @param id - The ID of the root node
 * @param name - The name of the root node
 * @param childrenData - Data for child nodes
 * @returns A hierarchical test model instance
 */
export function createHierarchicalTestData(
  id: string,
  name: string,
  childrenData: Array<{
    id: string;
    name: string;
    children?: Array<{
      id: string;
      name: string;
      children?: Array<any>;
    }>;
  }> = []
): IHierarchicalTestModel {
  const model = HierarchicalTestModel.create({
    id,
    name,
    children: []
  });
  
  childrenData.forEach(childData => {
    model.addChild(createHierarchicalTestData(
      childData.id,
      childData.name,
      childData.children || []
    ));
  });
  
  return model;
} 