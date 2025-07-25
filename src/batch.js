// src/batch.js
// N8N-focused batch processing utilities with automatic context injection

const _ = require('lodash');
const { createProcessingError } = require('./validation');
const { extractNodeData, getNodeValue } = require('./n8n');

/**
 * Create N8N-specific batch processing helpers with bound $ function
 * @param {Function} $fn - N8N's $ function from Code node context
 * @returns {Object} Helper functions with $ pre-bound and n8n-optimized
 */
function processItemsWithN8N($fn) {
  
  /**
   * Process n8n items with automatic context injection and node data retrieval
   * @param {Array} items - N8N items from $input.all() or $('NodeName').all()
   * @param {Function} processor - Processing function that receives context variables
   * @param {Array} nodeNames - Array of node names to extract data for each item (optional)
   * @param {Object} options - Processing options
   * @param {number} options.batchSize - Process in batches of this size
   * @param {boolean} options.logErrors - Log processing errors (default: true)
   * @param {boolean} options.stopOnError - Stop processing on first error (default: false)
   * @param {number} options.concurrency - For parallel processing (default: 1 = sequential)
   * @returns {Object} Processing results with items, errors, and stats
   */
  async function processItems(items, processor, nodeNames = [], options = {}) {
    const { 
      batchSize = null,
      logErrors = true, 
      stopOnError = false,
      concurrency = 1
    } = options;
    
    // Validate inputs
    if (!Array.isArray(items)) {
      throw new Error('Items must be an array from $input.all() or $("NodeName").all()');
    }
    
    if (typeof processor !== 'function') {
      throw new Error('Processor must be a function');
    }
    
    if (!Array.isArray(nodeNames)) {
      throw new Error('NodeNames must be an array of node names');
    }
    
    const results = [];
    const errors = [];
    let processedCount = 0;
    
    // Determine processing strategy
    if (concurrency > 1) {
      return await processItemsParallel(items, processor, nodeNames, { ...options, errors, results });
    }
    
    // Sequential processing with optional batching
    const batches = batchSize && batchSize > 0 ? _.chunk(items, batchSize) : [items];
    
    for (const batch of batches) {
      const batchStartIndex = processedCount;
      
      for (let i = 0; i < batch.length; i++) {
        const item = batch[i];
        const itemIndex = item.$itemIndex;
        
        try {
          // Extract node data for this item index
          const nodeData = {};
          for (const nodeName of nodeNames) {
            try {
              const nodeItem = $fn(nodeName)?.itemMatching?.(itemIndex) || $fn(nodeName)?.item;
              nodeData[nodeName] = nodeItem?.json || null;
            } catch (nodeError) {
              if (logErrors) {
                console.warn(`Failed to extract data from node '${nodeName}' for item ${itemIndex}:`, nodeError.message);
              }
              nodeData[nodeName] = null;
            }
          }
          
          // Create context variables for the processor
          const $item = item;
          const $json = item.json || item;
          const $itemIndex = itemIndex;
          
          // Call processor with context variables as parameters
          const processorArgs = [$item, $json, $itemIndex, ...nodeNames.map(name => nodeData[name])];
          const result = await processor(...processorArgs);
          
          // Add successful result
          results.push({
            json: result,
            pairedItem: itemIndex
          });
          
        } catch (error) {
          if (logErrors) {
            console.error(`Processing failed for item ${itemIndex}:`, error.message);
          }
          
          // Create error object
          const errorObj = createProcessingError(
            'processing_error',
            error.message,
            { 
              itemIndex, 
              originalData: _.pick(item.json || item, ['id', 'title', 'name', 'guid']),
              stack: error.stack
            }
          );
          
          // Add error to results with $error property
          results.push({
            json: {
              ...(item.json || item),
              $error: errorObj
            },
            pairedItem: itemIndex
          });
          
          // Add to errors array
          errors.push({
            itemIndex,
            error: errorObj,
            originalItem: item
          });
          
          if (stopOnError) {
            break;
          }
        }
      }
      
      processedCount += batch.length;
      
      if (stopOnError && errors.length > 0) {
        break;
      }
    }
    
    // Calculate statistics
    const stats = calculateStats(results, errors);
    
    return {
      results,
      errors,
      stats
    };
  }
  
  /**
   * Process items in parallel with automatic context injection
   * @private
   */
  async function processItemsParallel(items, processor, nodeNames, options) {
    const { concurrency, logErrors, errors, results } = options;
    
    const chunks = _.chunk(items, Math.ceil(items.length / concurrency));
    const allPromises = [];
    
    chunks.forEach((chunk, chunkIndex) => {
      const chunkPromise = Promise.all(
        chunk.map(async (item, itemIndexInChunk) => {
          const itemIndex = chunkIndex * chunk.length + itemIndexInChunk;
          
          try {
            // Extract node data for this item index
            const nodeData = {};
            for (const nodeName of nodeNames) {
              try {
                const nodeItem = $fn(nodeName)?.itemMatching?.(itemIndex) || $fn(nodeName)?.item;
                nodeData[nodeName] = nodeItem?.json || null;
              } catch (nodeError) {
                if (logErrors) {
                  console.warn(`Failed to extract data from node '${nodeName}' for item ${itemIndex}:`, nodeError.message);
                }
                nodeData[nodeName] = null;
              }
            }
            
            // Create context variables
            const $item = item;
            const $json = item.json || item;
            const $itemIndex = itemIndex;
            
            // Call processor
            const processorArgs = [$item, $json, $itemIndex, ...nodeNames.map(name => nodeData[name])];
            const result = await processor(...processorArgs);
            
            return {
              success: true,
              data: result,
              itemIndex
            };
            
          } catch (error) {
            if (logErrors) {
              console.error(`Processing failed for item ${itemIndex}:`, error.message);
            }
            
            return {
              success: false,
              error,
              item,
              itemIndex
            };
          }
        })
      );
      
      allPromises.push(chunkPromise);
    });
    
    // Wait for all chunks to complete
    const chunkResults = await Promise.all(allPromises);
    const flatResults = _.flatten(chunkResults);
    
    // Process results and errors
    flatResults.forEach(result => {
      if (result.success) {
        results.push({
          json: result.data,
          pairedItem: result.itemIndex
        });
      } else {
        const errorObj = createProcessingError(
          'async_processing_error',
          result.error.message,
          { 
            itemIndex: result.itemIndex,
            originalData: _.pick(result.item.json || result.item, ['id', 'title', 'name', 'guid']),
            stack: result.error.stack
          }
        );
        
        results.push({
          json: {
            ...(result.item.json || result.item),
            $error: errorObj
          },
          pairedItem: result.itemIndex
        });
        
        errors.push({
          itemIndex: result.itemIndex,
          error: errorObj,
          originalItem: result.item
        });
      }
    });
    
    const stats = calculateStats(results, errors);
    
    return {
      results,
      errors,
      stats
    };
  }
  
  /**
   * Filter and process items with automatic context injection
   * @param {Array} items - N8N items to filter and process
   * @param {Function} filterFn - Function to filter items (receives same context as processor)
   * @param {Function} processor - Processing function
   * @param {Array} nodeNames - Array of node names to extract data for each item
   * @param {Object} options - Processing options
   * @returns {Object} Processing results with filtering stats
   */
  async function filterAndProcess(items, filterFn, processor, nodeNames = [], options = {}) {
    const filteredItems = [];
    const originalIndices = [];
    
    // Filter items with context injection
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      try {
        // Extract node data for filtering
        const nodeData = {};
        for (const nodeName of nodeNames) {
          try {
            const nodeItem = $fn(nodeName)?.itemMatching?.(i) || $fn(nodeName)?.item;
            nodeData[nodeName] = nodeItem?.json || null;
          } catch (nodeError) {
            nodeData[nodeName] = null;
          }
        }
        
        // Create context variables
        const $item = item;
        const $json = item.json || item;
        const $itemIndex = i;
        
        // Call filter function with context
        const filterArgs = [$item, $json, $itemIndex, ...nodeNames.map(name => nodeData[name])];
        const shouldInclude = await filterFn(...filterArgs);
        
        if (shouldInclude) {
          filteredItems.push(item);
          originalIndices.push(i);
        }
        
      } catch (error) {
        console.warn(`Filter function failed for item ${i}:`, error.message);
        // Skip item on filter error
      }
    }
    
    // Process filtered items
    const processResult = await processItems(filteredItems, processor, nodeNames, options);
    
    return {
      ...processResult,
      filterStats: {
        totalItems: items.length,
        filteredCount: filteredItems.length,
        filterRate: filteredItems.length / items.length,
        originalIndices
      }
    };
  }
  
  return {
    processItems,
    filterAndProcess
  };
}

/**
 * Calculate processing statistics
 * @private
 */
function calculateStats(results, errors) {
  const total = results.length;
  const failed = errors.length;
  const successful = total - failed;
  
  const stats = {
    total,
    successful,
    failed,
    successRate: total > 0 ? successful / total : 0,
    failureRate: total > 0 ? failed / total : 0
  };
  
  if (failed > 0) {
    const errorTypes = {};
    errors.forEach(error => {
      const errorType = error.error?.type || 'unknown';
      errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;
    });
    
    stats.errorBreakdown = errorTypes;
    stats.sampleErrors = errors.slice(0, 3).map(error => ({
      type: error.error?.type,
      message: error.error?.message,
      itemIndex: error.itemIndex
    }));
  }
  
  return stats;
}

// Legacy function for backward compatibility (deprecated)
function processItemsWithPairing(items, processor, options = {}) {
  console.warn('processItemsWithPairing is deprecated. Use processItemsWithN8N($).processItems instead.');
  // Legacy implementation maintained for now
  const { 
    maintainPairing = true, 
    logErrors = true, 
    stopOnError = false,
    batchSize = null
  } = options;
  
  const outputItems = [];
  
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
    const results = processBatch(items, processor, 0, {
      maintainPairing,
      logErrors,
      stopOnError
    });
    outputItems.push(...results);
  }
  
  return outputItems;
}

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

module.exports = {
  processItemsWithN8N,
  // Legacy exports (deprecated)
  processItemsWithPairing
};