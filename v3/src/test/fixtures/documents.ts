/**
 * Test Data Fixtures for Documents
 * 
 * This file contains sample documents for use in tests.
 */

import { sampleDataset, dateDataset } from './datasets';

/**
 * A simple document with a single dataset
 */
export const sampleDocument = {
  name: 'Sample Document',
  title: 'Sample Document',
  description: 'A sample document for testing',
  metadata: {
    author: 'Test User',
    created: '2023-01-01T00:00:00.000Z',
    modified: '2023-01-02T00:00:00.000Z',
    version: '1.0.0'
  },
  datasets: [
    sampleDataset
  ],
  components: [
    {
      id: 'comp1',
      type: 'table',
      title: 'Sample Table',
      datasetId: sampleDataset.name,
      position: { x: 0, y: 0, width: 400, height: 300 }
    },
    {
      id: 'comp2',
      type: 'graph',
      title: 'Sample Graph',
      datasetId: sampleDataset.name,
      position: { x: 410, y: 0, width: 400, height: 300 },
      graphConfig: {
        plotType: 'scatter',
        xAttributeId: 'attr1',
        yAttributeId: 'attr3'
      }
    }
  ]
};

/**
 * A document with multiple datasets
 */
export const multiDatasetDocument = {
  name: 'Multi-Dataset Document',
  title: 'Multi-Dataset Document',
  description: 'A document with multiple datasets for testing',
  metadata: {
    author: 'Test User',
    created: '2023-02-01T00:00:00.000Z',
    modified: '2023-02-02T00:00:00.000Z',
    version: '1.0.0'
  },
  datasets: [
    sampleDataset,
    dateDataset
  ],
  components: [
    {
      id: 'comp1',
      type: 'table',
      title: 'Sample Table',
      datasetId: sampleDataset.name,
      position: { x: 0, y: 0, width: 400, height: 300 }
    },
    {
      id: 'comp2',
      type: 'table',
      title: 'Date Table',
      datasetId: dateDataset.name,
      position: { x: 0, y: 310, width: 400, height: 300 }
    },
    {
      id: 'comp3',
      type: 'graph',
      title: 'Sample Graph',
      datasetId: sampleDataset.name,
      position: { x: 410, y: 0, width: 400, height: 300 },
      graphConfig: {
        plotType: 'scatter',
        xAttributeId: 'attr1',
        yAttributeId: 'attr3'
      }
    },
    {
      id: 'comp4',
      type: 'graph',
      title: 'Date Graph',
      datasetId: dateDataset.name,
      position: { x: 410, y: 310, width: 400, height: 300 },
      graphConfig: {
        plotType: 'bar',
        xAttributeId: 'attr2',
        yAttributeId: 'attr1'
      }
    }
  ]
};

/**
 * A document with complex layout
 */
export const complexLayoutDocument = {
  name: 'Complex Layout Document',
  title: 'Complex Layout Document',
  description: 'A document with a complex layout for testing',
  metadata: {
    author: 'Test User',
    created: '2023-03-01T00:00:00.000Z',
    modified: '2023-03-02T00:00:00.000Z',
    version: '1.0.0'
  },
  datasets: [
    sampleDataset
  ],
  components: [
    {
      id: 'comp1',
      type: 'table',
      title: 'Sample Table',
      datasetId: sampleDataset.name,
      position: { x: 0, y: 0, width: 300, height: 200 }
    },
    {
      id: 'comp2',
      type: 'graph',
      title: 'Scatter Plot',
      datasetId: sampleDataset.name,
      position: { x: 310, y: 0, width: 300, height: 200 },
      graphConfig: {
        plotType: 'scatter',
        xAttributeId: 'attr1',
        yAttributeId: 'attr3'
      }
    },
    {
      id: 'comp3',
      type: 'graph',
      title: 'Bar Chart',
      datasetId: sampleDataset.name,
      position: { x: 0, y: 210, width: 300, height: 200 },
      graphConfig: {
        plotType: 'bar',
        xAttributeId: 'attr4',
        yAttributeId: 'attr3'
      }
    },
    {
      id: 'comp4',
      type: 'text',
      title: 'Notes',
      position: { x: 310, y: 210, width: 300, height: 200 },
      content: 'This is a sample document with a complex layout for testing purposes.'
    },
    {
      id: 'comp5',
      type: 'map',
      title: 'Map',
      datasetId: sampleDataset.name,
      position: { x: 620, y: 0, width: 300, height: 410 }
    }
  ]
};

/**
 * A document factory function for creating customized documents
 * 
 * @param overrides - Properties to override in the default document
 * @returns A customized document
 */
export function createDocument(overrides: Partial<typeof sampleDocument> = {}) {
  return {
    ...sampleDocument,
    ...overrides
  };
}

/**
 * A component factory function for creating customized components
 * 
 * @param type - The type of component to create
 * @param overrides - Properties to override in the default component
 * @returns A customized component
 */
export function createComponent(
  type: 'table' | 'graph' | 'text' | 'map',
  overrides: Record<string, any> = {}
) {
  const baseComponent = {
    id: `comp${Math.floor(Math.random() * 10000)}`,
    title: `${type.charAt(0).toUpperCase() + type.slice(1)} Component`,
    position: { x: 0, y: 0, width: 400, height: 300 }
  };

  // Add type-specific properties
  let typeSpecificProps = {};
  
  switch (type) {
    case 'table':
      typeSpecificProps = {
        type: 'table',
        datasetId: sampleDataset.name
      };
      break;
    case 'graph':
      typeSpecificProps = {
        type: 'graph',
        datasetId: sampleDataset.name,
        graphConfig: {
          plotType: 'scatter',
          xAttributeId: 'attr1',
          yAttributeId: 'attr3'
        }
      };
      break;
    case 'text':
      typeSpecificProps = {
        type: 'text',
        content: 'Sample text content'
      };
      break;
    case 'map':
      typeSpecificProps = {
        type: 'map',
        datasetId: sampleDataset.name
      };
      break;
  }

  return {
    ...baseComponent,
    ...typeSpecificProps,
    ...overrides
  };
} 