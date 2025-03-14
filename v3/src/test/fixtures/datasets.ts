/**
 * Test Data Fixtures for Datasets
 * 
 * This file contains sample datasets for use in tests.
 */

import { types } from 'mobx-state-tree';
import { DataSet } from '../../models/data/data-set';
import { Attribute } from '../../models/data/attribute';
import { ICase, ICaseCreation } from '../../models/data/data-set-types';

/**
 * Creates a simple dataset with the specified attributes and cases
 * @param id Dataset ID
 * @param name Dataset name
 * @param attributes Array of attribute definitions
 * @param cases Array of case data
 * @returns A DataSet instance
 */
export function createTestDataset(
  id: string = 'test-dataset',
  name: string = 'Test Dataset',
  attributes: Array<{id: string, name: string, type?: string}> = [],
  cases: Array<Record<string, any>> = []
) {
  // Create the dataset
  const dataset = DataSet.create({
    id,
    name,
    sourceID: 'test'
  });
  
  // Add attributes
  attributes.forEach(attr => {
    dataset.addAttribute(Attribute.create({
      id: attr.id,
      name: attr.name
    }));
  });
  
  // Add cases
  if (cases.length > 0) {
    const casesToAdd: ICaseCreation[] = cases.map((caseData, index) => {
      return {
        __id__: `case-${index + 1}`,
        ...caseData
      };
    });
    
    dataset.addCases(casesToAdd);
  }
  
  return dataset;
}

/**
 * A simple dataset with numeric and string attributes
 */
export const sampleDataset = {
  name: 'Sample Dataset',
  title: 'Sample Dataset',
  description: 'A sample dataset for testing',
  attributes: [
    { id: 'attr1', name: 'id', title: 'ID', type: 'numeric', description: 'Unique identifier' },
    { id: 'attr2', name: 'name', title: 'Name', type: 'string', description: 'Item name' },
    { id: 'attr3', name: 'value', title: 'Value', type: 'numeric', description: 'Item value' },
    { id: 'attr4', name: 'category', title: 'Category', type: 'string', description: 'Item category' }
  ],
  cases: [
    { id: 'case1', attr1: 1, attr2: 'Item 1', attr3: 10.5, attr4: 'Category A' },
    { id: 'case2', attr1: 2, attr2: 'Item 2', attr3: 20.75, attr4: 'Category B' },
    { id: 'case3', attr1: 3, attr2: 'Item 3', attr3: 15.25, attr4: 'Category A' },
    { id: 'case4', attr1: 4, attr2: 'Item 4', attr3: 30.0, attr4: 'Category C' },
    { id: 'case5', attr1: 5, attr2: 'Item 5', attr3: 25.5, attr4: 'Category B' }
  ]
};

/**
 * A dataset with date and boolean attributes
 */
export const dateDataset = {
  name: 'Date Dataset',
  title: 'Date Dataset',
  description: 'A dataset with date attributes for testing',
  attributes: [
    { id: 'attr1', name: 'id', title: 'ID', type: 'numeric', description: 'Unique identifier' },
    { id: 'attr2', name: 'name', title: 'Name', type: 'string', description: 'Event name' },
    { id: 'attr3', name: 'date', title: 'Date', type: 'date', description: 'Event date' },
    { id: 'attr4', name: 'completed', title: 'Completed', type: 'boolean', description: 'Completion status' }
  ],
  cases: [
    { id: 'case1', attr1: 1, attr2: 'Event 1', attr3: '2023-01-15', attr4: true },
    { id: 'case2', attr1: 2, attr2: 'Event 2', attr3: '2023-02-20', attr4: false },
    { id: 'case3', attr1: 3, attr2: 'Event 3', attr3: '2023-03-10', attr4: true },
    { id: 'case4', attr1: 4, attr2: 'Event 4', attr3: '2023-04-05', attr4: false },
    { id: 'case5', attr1: 5, attr2: 'Event 5', attr3: '2023-05-25', attr4: true }
  ]
};

/**
 * Empty dataset with no attributes or cases
 */
export const emptyDataset = () => createTestDataset('empty-dataset', 'Empty Dataset');

/**
 * Simple numeric dataset with two attributes and three cases
 */
export const numericDataset = () => createTestDataset(
  'numeric-dataset',
  'Numeric Dataset',
  [
    { id: 'x', name: 'X' },
    { id: 'y', name: 'Y' }
  ],
  [
    { x: 1, y: 10 },
    { x: 2, y: 20 },
    { x: 3, y: 30 }
  ]
);

/**
 * Mixed-type dataset with numeric, categorical, and date attributes
 */
export const mixedTypeDataset = () => createTestDataset(
  'mixed-dataset',
  'Mixed Type Dataset',
  [
    { id: 'id', name: 'ID' },
    { id: 'name', name: 'Name' },
    { id: 'value', name: 'Value' },
    { id: 'date', name: 'Date' }
  ],
  [
    { id: 1, name: 'Item A', value: 10.5, date: '2023-01-01' },
    { id: 2, name: 'Item B', value: 20.7, date: '2023-02-15' },
    { id: 3, name: 'Item C', value: 15.2, date: '2023-03-30' }
  ]
);

/**
 * Large dataset with many cases for performance testing
 */
export const largeDataset = () => {
  const attributes = [
    { id: 'id', name: 'ID' },
    { id: 'x', name: 'X' },
    { id: 'y', name: 'Y' },
    { id: 'z', name: 'Z' }
  ];
  
  const cases = Array.from({ length: 1000 }, (_, i) => ({
    id: i + 1,
    x: Math.random() * 100,
    y: Math.random() * 100,
    z: Math.random() * 100
  }));
  
  return createTestDataset('large-dataset', 'Large Dataset', attributes, cases);
};

/**
 * Dataset with missing values
 */
export const datasetWithMissingValues = () => createTestDataset(
  'missing-values-dataset',
  'Dataset with Missing Values',
  [
    { id: 'a', name: 'A' },
    { id: 'b', name: 'B' },
    { id: 'c', name: 'C' }
  ],
  [
    { a: 1, b: 2, c: 3 },
    { a: 4, c: 6 },  // b is missing
    { a: 7, b: 8 },  // c is missing
    { b: 9, c: 10 }  // a is missing
  ]
);

/**
 * A dataset factory function for creating customized datasets
 * 
 * @param overrides - Properties to override in the default dataset
 * @returns A customized dataset
 */
export function createDataset(overrides: Partial<typeof sampleDataset> = {}) {
  return {
    ...sampleDataset,
    ...overrides
  };
}

/**
 * A case factory function for creating customized cases
 * 
 * @param overrides - Properties to override in the default case
 * @returns A customized case
 */
export function createCase(overrides: Record<string, any> = {}) {
  return {
    id: `case${Math.floor(Math.random() * 10000)}`,
    attr1: Math.floor(Math.random() * 100),
    attr2: `Item ${Math.floor(Math.random() * 100)}`,
    attr3: Math.round(Math.random() * 1000) / 10,
    attr4: `Category ${String.fromCharCode(65 + Math.floor(Math.random() * 5))}`,
    ...overrides
  };
}

/**
 * An attribute factory function for creating customized attributes
 * 
 * @param overrides - Properties to override in the default attribute
 * @returns A customized attribute
 */
export function createAttribute(overrides: Record<string, any> = {}) {
  return {
    id: `attr${Math.floor(Math.random() * 10000)}`,
    name: `attribute${Math.floor(Math.random() * 100)}`,
    title: `Attribute ${Math.floor(Math.random() * 100)}`,
    type: 'string',
    description: `Description for attribute ${Math.floor(Math.random() * 100)}`,
    ...overrides
  };
} 