/**
 * Tests for MobX/MST Testing Utilities
 */

import { types, getSnapshot } from 'mobx-state-tree';
import { reaction } from 'mobx';
import { waitForReactions, trackModelChanges, createModelSnapshot, setupMobXTest, cleanupMobXTest } from './mobxTestSetup';
import { mockModel, partialMockModel, spyOnModelMethod } from './mockModel';

// Define a simple MST model for testing
const TestModel = types
  .model('TestModel', {
    value: types.number,
    name: types.optional(types.string, '')
  })
  .views(self => ({
    get doubled() {
      return self.value * 2;
    }
  }))
  .actions(self => ({
    setValue(newValue: number) {
      self.value = newValue;
    },
    setName(newName: string) {
      self.name = newName;
    }
  }));

describe('MobX Testing Utilities', () => {
  // Set up and clean up for each test
  beforeEach(() => {
    setupMobXTest();
  });

  afterEach(() => {
    cleanupMobXTest();
  });

  describe('waitForReactions', () => {
    it('should wait for reactions to complete', async () => {
      // Create a model
      const model = TestModel.create({ value: 1 });
      
      // Set up a reaction counter
      let reactionCount = 0;
      const disposer = reaction(
        () => model.value,
        () => {
          reactionCount++;
        }
      );
      
      // Change the value to trigger the reaction
      model.setValue(2);
      
      // Wait for reactions to complete
      await waitForReactions();
      
      // Check that the reaction was triggered
      expect(reactionCount).toBe(1);
      
      // Clean up
      disposer();
    });
  });

  describe('trackModelChanges', () => {
    it('should track changes to a model', () => {
      // Create a model
      const model = TestModel.create({ value: 1, name: 'Test' });
      
      // Start tracking changes
      const tracker = trackModelChanges(model);
      
      // Make some changes
      model.setValue(2);
      model.setName('Updated');
      
      // Get the tracked changes
      const changes = tracker.getChanges();
      
      // Check that the changes were tracked correctly
      expect(changes).toHaveLength(2);
      expect(changes[0]).toEqual({
        path: ['value'],
        oldValue: 1,
        newValue: 2
      });
      expect(changes[1]).toEqual({
        path: ['name'],
        oldValue: 'Test',
        newValue: 'Updated'
      });
      
      // Clear the changes
      tracker.clearChanges();
      expect(tracker.getChanges()).toHaveLength(0);
      
      // Dispose the tracker
      tracker.dispose();
    });
  });

  describe('createModelSnapshot', () => {
    it('should create a snapshot of a model', () => {
      // Create a model
      const model = TestModel.create({ value: 1, name: 'Test' });
      
      // Create a snapshot
      const snapshot = createModelSnapshot(model);
      
      // Check that the snapshot is correct
      expect(snapshot).toEqual({
        value: 1,
        name: 'Test'
      });
    });

    it('should exclude specified properties from the snapshot', () => {
      // Create a model
      const model = TestModel.create({ value: 1, name: 'Test' });
      
      // Create a snapshot excluding the name property
      const snapshot = createModelSnapshot(model, ['name']);
      
      // Check that the snapshot is correct
      expect(snapshot).toEqual({
        value: 1
      });
      expect(snapshot.name).toBeUndefined();
    });
  });

  describe('mockModel', () => {
    it('should create a mock model with the specified properties', () => {
      // Create a mock model
      const mockFn = jest.fn();
      const mock = mockModel('MockModel', {
        value: 1,
        name: 'Mock',
        doubled: 2,
        setValue: mockFn
      });
      
      // Check that the properties are correct
      expect(mock.value).toBe(1);
      expect(mock.name).toBe('Mock');
      expect(mock.doubled).toBe(2);
      
      // Call the mocked method
      mock.setValue(2);
      
      // Check that the method was called
      expect(mockFn).toHaveBeenCalledWith(2);
    });
  });

  describe('partialMockModel', () => {
    it('should create a partial mock of an existing model type', () => {
      // Create a partial mock
      const setValue = jest.fn();
      const mock = partialMockModel(
        TestModel,
        { value: 1, name: 'Original' },
        { setValue, name: 'Overridden' }
      );
      
      // Check that the properties are correct
      expect((mock as any).value).toBe(1);
      expect((mock as any).name).toBe('Overridden');
      
      // Call the mocked method
      (mock as any).setValue(2);
      
      // Check that the method was called
      expect(setValue).toHaveBeenCalledWith(2);
      
      // The original value should not have changed since we mocked the setValue method
      expect((mock as any).value).toBe(1);
    });
  });

  describe('spyOnModelMethod', () => {
    it('should spy on a model method', () => {
      // Create a model
      const model = TestModel.create({ value: 1 });
      
      // Spy on the setValue method
      const spy = spyOnModelMethod(model, 'setValue');
      
      // Call the method
      model.setValue(2);
      model.setValue(3);
      
      // Check that the spy recorded the calls
      expect(spy.callCount).toBe(2);
      expect(spy.calls[0]).toEqual([2]);
      expect(spy.calls[1]).toEqual([3]);
      
      // Check that the method actually worked
      expect(model.value).toBe(3);
      
      // Reset the spy
      spy.reset();
      expect(spy.callCount).toBe(0);
    });

    it('should throw an error if the method does not exist', () => {
      // Create a model
      const model = TestModel.create({ value: 1 });
      
      // Try to spy on a non-existent method
      expect(() => {
        spyOnModelMethod(model, 'nonExistentMethod');
      }).toThrow('Method nonExistentMethod does not exist or is not a function');
    });
  });
}); 