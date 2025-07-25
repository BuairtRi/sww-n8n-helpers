// src/batch.js
// Batch processing utilities optimized for n8n workflows

const _ = require('lodash');
const { createProcessingError } = require('./validation');

/**
 * Process array with error handling and pairing maintenance
 * @param {Array} items - Items to process
 * @param {Function} processor - Processing function
 * @param {Object} options - Processing options
 * @param {boolean} options.maintainPairing - Maintain n8n item pairing
 * @param {boolean} options.logErrors - Log processing errors
 * @param {boolean} options.stopOnError - Stop processing on first error
 * @param {number} options.batchSize - Process in batches of this size
 * @returns {Array} Processed items with pairing
 */
function processItemsWithPairing(items, processor, options = {}) {
  const { 
    maintainPairing = true, 
    logErrors = true, 
    stopOnError = false,
    batchSize = null
  } = options;
  
  const outputItems = [];
  
  // Process in batches if specified
  if (batchSize && batchSize > 0) {
    const batches = _.chunk(items, batchSize);
    let currentIndex = 0;
    
    for (const batch of batches) {
      const batchResults = processBatch(batch, processor, currentIndex, {
        maintainPairing,
        logErrors,
        stopOnError
      });
      
      outputItems.push(...batchResults);
      currentIndex += batch.length;
      
      if (stopOnError && batchResults.some(item => item.json?._error)) {
        break;
      }
    }
  } else {
    // Process all items at once
    const results = processBatch(items, processor, 0, {
      maintainPairing,
      logErrors,
      stopOnError
    });
    outputItems.push(...results);
  }
  
  return outputItems;
}

/**
 * Process a batch of items
 * @private
 */
function processBatch(items, processor, startIndex, options) {
  const { maintainPairing, logErrors, stopOnError } = options;
  const batchResults = [];
  
  for (let i = 0; i < items.length; i++) {
    const globalIndex = startIndex + i;
    const item = items[i];
    
    try {
      const result = processor(item, globalIndex);
      
      if (maintainPairing) {
        batchResults.push({
          json: result,
          pairedItem: globalIndex
        });
      } else {
        batchResults.push(result);
      }
      
    } catch (error) {
      if (logErrors) {
        console.error(`Processing failed for item ${globalIndex}:`, error.message);
      }
      
      const errorResult = createProcessingError(
        'processing_error',
        error.message,
        { 
          itemIndex: globalIndex, 
          originalData: _.pick(item, ['id', 'title', 'name', 'guid']) 
        }
      );
      
      if (maintainPairing) {
        batchResults.push({
          json: errorResult,
          pairedItem: globalIndex
        });
      } else {
        batchResults.push(errorResult);
      }
      
      if (stopOnError) {
        break;
      }
    }
  }
  
  return batchResults;
}

/**
 * Filter and process items based on conditions
 * @param {Array} items - Items to filter and process
 * @param {Function} filterFn - Function to filter items
 * @param {Function} processor - Function to process filtered items
 * @param {Object} options - Processing options
 * @returns {Object} Results with processed and filtered counts
 */
function filterAndProcess(items, filterFn, processor, options = {}) {
  const { maintainOriginalIndices = true } = options;
  
  const filteredItems = [];
  const originalIndices = [];
  
  // Filter items and track original indices
  items.forEach((item, index) => {
    if (filterFn(item, index)) {
      filteredItems.push(item);
      originalIndices.push(index);
    }
  });
  
  // Process filtered items
  const processed = processItemsWithPairing(filteredItems, (item, filteredIndex) => {
    const originalIndex = maintainOriginalIndices ? originalIndices[filteredIndex] : filteredIndex;
    return processor(item, originalIndex, filteredIndex);
  }, options);
  
  return {
    processed,
    totalItems: items.length,
    filteredCount: filteredItems.length,
    processedCount: processed.length,
    filterRate: filteredItems.length / items.length
  };
}

/**
 * Process items in parallel groups
 * @param {Array} items - Items to process
 * @param {Function} processor - Processing function
 * @param {Object} options - Processing options
 * @param {number} options.concurrency - Number of parallel processes
 * @returns {Promise<Array>} Processed items
 */
async function processItemsParallel(items, processor, options = {}) {
  const { concurrency = 3, maintainOrder = true } = options;
  
  if (!maintainOrder) {
    // Simple parallel processing without order preservation
    const chunks = _.chunk(items, Math.ceil(items.length / concurrency));
    const promises = chunks.map(chunk => 
      Promise.all(chunk.map(processor))
    );
    
    const results = await Promise.all(promises);
    return _.flatten(results);
  }
  
  // Maintain order using indexed processing
  const results = new Array(items.length);
  const promises = [];
  
  for (let i = 0; i < items.length; i += concurrency) {
    const chunk = items.slice(i, i + concurrency);
    const chunkPromises = chunk.map(async (item, chunkIndex) => {
      const globalIndex = i + chunkIndex;
      try {
        const result = await processor(item, globalIndex);
        results[globalIndex] = { success: true, data: result };
      } catch (error) {
        results[globalIndex] = { 
          success: false, 
          error: createProcessingError('async_processing_error', error.message, { itemIndex: globalIndex })
        };
      }
    });
    
    promises.push(Promise.all(chunkPromises));
  }
  
  await Promise.all(promises);
  
  return results.map((result, index) => ({
    json: result.success ? result.data : result.error,
    pairedItem: index
  }));
}

/**
 * Aggregate results from processed items
 * @param {Array} processedItems - Items that have been processed
 * @param {Object} options - Aggregation options
 * @returns {Object} Aggregation statistics
 */
function aggregateResults(processedItems, options = {}) {
  const { includeErrorDetails = false } = options;
  
  const total = processedItems.length;
  const successful = processedItems.filter(item => !item.json?._error);
  const failed = processedItems.filter(item => item.json?._error);
  
  const stats = {
    total,
    successful: successful.length,
    failed: failed.length,
    successRate: total > 0 ? successful.length / total : 0,
    failureRate: total > 0 ? failed.length / total : 0
  };
  
  if (includeErrorDetails && failed.length > 0) {
    const errorTypes = {};
    failed.forEach(item => {
      const errorType = item.json._error?.type || 'unknown';
      errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;
    });
    
    stats.errorBreakdown = errorTypes;
    stats.sampleErrors = failed.slice(0, 3).map(item => ({
      type: item.json._error?.type,
      message: item.json._error?.message,
      itemIndex: item.pairedItem
    }));
  }
  
  return stats;
}

/**
 * Retry failed items from a previous processing run
 * @param {Array} processedItems - Previously processed items
 * @param {Array} originalItems - Original input items
 * @param {Function} processor - Processing function
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum retry attempts
 * @returns {Array} Reprocessed items
 */
function retryFailedItems(processedItems, originalItems, processor, options = {}) {
  const { maxRetries = 1 } = options;
  
  // Find failed items
  const failedIndices = processedItems
    .filter(item => item.json?._error)
    .map(item => item.pairedItem);
  
  if (failedIndices.length === 0) {
    return processedItems; // No failures to retry
  }
  
  console.log(`Retrying ${failedIndices.length} failed items (max ${maxRetries} attempts)`);
  
  // Get original items for retry
  const itemsToRetry = failedIndices.map(index => ({
    item: originalItems[index],
    originalIndex: index,
    attempts: 1
  }));
  
  const retryCycles = [];
  let currentItems = itemsToRetry;
  
  for (let attempt = 1; attempt <= maxRetries && currentItems.length > 0; attempt++) {
    console.log(`Retry attempt ${attempt}/${maxRetries} for ${currentItems.length} items`);
    
    const retryResults = processItemsWithPairing(
      currentItems.map(retry => retry.item),
      processor,
      { maintainPairing: false, logErrors: true }
    );
    
    // Track which items still failed
    const stillFailed = [];
    retryResults.forEach((result, index) => {
      const retryItem = currentItems[index];
      
      if (result._error) {
        stillFailed.push({
          ...retryItem,
          attempts: retryItem.attempts + 1
        });
      } else {
        // Success! Update the original result
        const originalIndex = retryItem.originalIndex;
        const processedIndex = processedItems.findIndex(item => item.pairedItem === originalIndex);
        
        if (processedIndex >= 0) {
          processedItems[processedIndex] = {
            json: result,
            pairedItem: originalIndex
          };
        }
      }
    });
    
    currentItems = stillFailed;
    retryCycles.push({
      attempt,
      attempted: retryResults.length,
      successful: retryResults.length - stillFailed.length,
      failed: stillFailed.length
    });
  }
  
  console.log('Retry summary:', retryCycles);
  
  return processedItems;
}

module.exports = {
  processItemsWithPairing,
  filterAndProcess,
  processItemsParallel,
  aggregateResults,
  retryFailedItems
};