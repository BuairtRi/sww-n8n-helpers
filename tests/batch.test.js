// tests/batch.test.js
const {
  processItemsWithPairing,
  filterAndProcess,
  processItemsParallel,
  aggregateResults,
  retryFailedItems
} = require('../index');

describe('Batch Processing Utilities', () => {
  describe('processItemsWithPairing', () => {
    const mockProcessor = jest.fn((item, index) => ({ processed: true, originalIndex: index, data: item }));
    
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('should process items with pairing maintained', () => {
      const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const result = processItemsWithPairing(items, mockProcessor);
      
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        json: { processed: true, originalIndex: 0, data: { id: 1 } },
        pairedItem: 0
      });
      expect(mockProcessor).toHaveBeenCalledTimes(3);
    });

    test('should process items without pairing when maintainPairing is false', () => {
      const items = [{ id: 1 }, { id: 2 }];
      const result = processItemsWithPairing(items, mockProcessor, { maintainPairing: false });
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ processed: true, originalIndex: 0, data: { id: 1 } });
    });

    test('should handle processing errors gracefully', () => {
      const errorProcessor = jest.fn(() => { throw new Error('Processing failed'); });
      const items = [{ id: 1 }];
      
      const result = processItemsWithPairing(items, errorProcessor, { logErrors: false });
      
      expect(result).toHaveLength(1);
      expect(result[0].json._error).toBeDefined();
      expect(result[0].json._error.type).toBe('processing_error');
    });

    test('should stop on error when stopOnError is true', () => {
      const errorProcessor = jest.fn((item, index) => {
        if (index === 1) throw new Error('Stop here');
        return { success: true };
      });
      const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
      
      const result = processItemsWithPairing(items, errorProcessor, { stopOnError: true, logErrors: false });
      
      expect(result).toHaveLength(2);
      expect(errorProcessor).toHaveBeenCalledTimes(2);
    });

    test('should process in batches when batchSize is specified', () => {
      const items = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];
      const result = processItemsWithPairing(items, mockProcessor, { batchSize: 2 });
      
      expect(result).toHaveLength(4);
      expect(mockProcessor).toHaveBeenCalledTimes(4);
    });
  });

  describe('filterAndProcess', () => {
    const filterFn = jest.fn((item) => item.id % 2 === 0);
    const processor = jest.fn((item, originalIndex, filteredIndex) => ({ 
      ...item, 
      processed: true, 
      originalIndex, 
      filteredIndex 
    }));

    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('should filter and process items correctly', () => {
      const items = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];
      const result = filterAndProcess(items, filterFn, processor);
      
      expect(result.totalItems).toBe(4);
      expect(result.filteredCount).toBe(2);
      expect(result.processedCount).toBe(2);
      expect(result.filterRate).toBe(0.5);
      expect(filterFn).toHaveBeenCalledTimes(4);
      expect(processor).toHaveBeenCalledTimes(2);
    });

    test('should maintain original indices', () => {
      const items = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];
      const result = filterAndProcess(items, filterFn, processor);
      
      // Check that original indices are preserved
      expect(result.processed[0].json.originalIndex).toBe(1); // item with id: 2
      expect(result.processed[1].json.originalIndex).toBe(3); // item with id: 4
    });
  });

  describe('processItemsParallel', () => {
    test('should process items in parallel maintaining order', async () => {
      const asyncProcessor = jest.fn(async (item, index) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return { processed: true, index, data: item };
      });
      
      const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const result = await processItemsParallel(items, asyncProcessor, { concurrency: 2 });
      
      expect(result).toHaveLength(3);
      expect(result[0].json.index).toBe(0);
      expect(result[1].json.index).toBe(1);
      expect(result[2].json.index).toBe(2);
    });

    test('should handle async processing errors', async () => {
      const errorProcessor = jest.fn(async (item, index) => {
        if (index === 1) throw new Error('Async error');
        return { success: true };
      });
      
      const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const result = await processItemsParallel(items, errorProcessor);
      
      expect(result).toHaveLength(3);
      expect(result[1].json._error).toBeDefined();
      expect(result[1].json._error.type).toBe('async_processing_error');
    });

    test('should process without maintaining order when maintainOrder is false', async () => {
      const processor = jest.fn(async (item) => ({ data: item }));
      const items = [{ id: 1 }, { id: 2 }];
      
      const result = await processItemsParallel(items, processor, { maintainOrder: false });
      
      expect(result).toHaveLength(2);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('aggregateResults', () => {
    test('should calculate correct statistics for successful items', () => {
      const processedItems = [
        { json: { success: true }, pairedItem: 0 },
        { json: { success: true }, pairedItem: 1 },
        { json: { success: true }, pairedItem: 2 }
      ];
      
      const stats = aggregateResults(processedItems);
      
      expect(stats.total).toBe(3);
      expect(stats.successful).toBe(3);
      expect(stats.failed).toBe(0);
      expect(stats.successRate).toBe(1);
      expect(stats.failureRate).toBe(0);
    });

    test('should calculate correct statistics with errors', () => {
      const processedItems = [
        { json: { success: true }, pairedItem: 0 },
        { json: { _error: { type: 'validation_error', message: 'Invalid data' } }, pairedItem: 1 },
        { json: { _error: { type: 'processing_error', message: 'Failed to process' } }, pairedItem: 2 }
      ];
      
      const stats = aggregateResults(processedItems, { includeErrorDetails: true });
      
      expect(stats.total).toBe(3);
      expect(stats.successful).toBe(1);
      expect(stats.failed).toBe(2);
      expect(stats.successRate).toBeCloseTo(0.33, 2);
      expect(stats.failureRate).toBeCloseTo(0.67, 2);
      expect(stats.errorBreakdown).toEqual({
        validation_error: 1,
        processing_error: 1
      });
      expect(stats.sampleErrors).toHaveLength(2);
    });

    test('should handle empty array', () => {
      const stats = aggregateResults([]);
      
      expect(stats.total).toBe(0);
      expect(stats.successful).toBe(0);
      expect(stats.failed).toBe(0);
      expect(stats.successRate).toBe(0);
      expect(stats.failureRate).toBe(0);
    });
  });

  describe('retryFailedItems', () => {
    const originalItems = [
      { id: 1, data: 'item1' },
      { id: 2, data: 'item2' },
      { id: 3, data: 'item3' }
    ];

    test('should retry failed items successfully', () => {
      const processedItems = [
        { json: { success: true }, pairedItem: 0 },
        { json: { _error: { type: 'temp_error' } }, pairedItem: 1 },
        { json: { success: true }, pairedItem: 2 }
      ];

      const retryProcessor = jest.fn((item) => ({ success: true, retried: true }));
      
      const result = retryFailedItems(processedItems, originalItems, retryProcessor, { maxRetries: 1 });
      
      expect(retryProcessor).toHaveBeenCalledTimes(1);
      expect(result[1].json.success).toBe(true);
      expect(result[1].json.retried).toBe(true);
    });

    test('should return original items when no failures', () => {
      const processedItems = [
        { json: { success: true }, pairedItem: 0 },
        { json: { success: true }, pairedItem: 1 },
        { json: { success: true }, pairedItem: 2 }
      ];

      const retryProcessor = jest.fn();
      
      const result = retryFailedItems(processedItems, originalItems, retryProcessor);
      
      expect(retryProcessor).not.toHaveBeenCalled();
      expect(result).toBe(processedItems);
    });

    test('should handle persistent failures after max retries', () => {
      const processedItems = [
        { json: { _error: { type: 'persistent_error' } }, pairedItem: 0 }
      ];

      const failingProcessor = jest.fn(() => { throw new Error('Still failing'); });
      
      const result = retryFailedItems(processedItems, originalItems, failingProcessor, { maxRetries: 2 });
      
      expect(failingProcessor).toHaveBeenCalledTimes(2);
      expect(result[0].json._error).toBeDefined();
    });
  });
}); 