// src/batch.js
// N8N-focused batch processing utilities with automatic context injection

const _ = require('lodash');
const { createProcessingError } = require('./validation');
const { extractNodeData, getNodeValue } = require('./n8n');

/**
 * Convert node name to camelCase for use as processor parameter
 * @param {string} nodeName - Original node name (may have spaces)
 * @returns {string} camelCase version of the node name
 */
function toCamelCase(nodeName) {
  return nodeName
    // Replace special characters and underscores with spaces, then split
    .replace(/[^\w\s]/g, ' ')
    .replace(/_/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 0) // Remove empty strings
    .map((word, index) => {
      if (index === 0) {
        // First word lowercase
        return word.toLowerCase();
      }
      // Subsequent words capitalized
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join('');
}

/**
 * Create N8N-specific batch processing helpers with bound $ function
 * @param {Function} $fn - N8N's $ function from Code node context
 * @returns {Object} Helper functions with $ pre-bound and n8n-optimized
 */
function processItemsWithN8N($fn) {
  
  /**
   * Process n8n items with automatic context injection and node data retrieval
   * @param {Array} items - N8N items from $input.all() or $('NodeName').all()
   * @param {Function} processor - Processing function that receives: ($item, $json, $itemIndex, ...nodeData)
   *   - $item: Full n8n item object
   *   - $json: Item's json data
   *   - $itemIndex: Current item index
   *   - ...nodeData: Individual node data in nodeNames array order, with camelCase parameter names
   *     Example: ['Ingestion Sources', 'User Settings'] → (item, json, itemIndex, ingestionSources, userSettings)
   * @param {Array} nodeNames - Array of node names to extract data for each item (can contain spaces/special chars)
   * @param {Object} options - Processing options
   * @param {boolean} options.logErrors - Log processing errors (default: true)
   * @param {boolean} options.stopOnError - Stop processing on first error (default: false)
   * @returns {Object} Processing results with items, errors, and stats
   */
  function processItems(items, processor, nodeNames = [], options = {}) {
    const { 
      logErrors = true, 
      stopOnError = false
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
    
    // Simple synchronous loop through all items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemIndex = i;
      
      try {
        // Extract node data for this item index
        const nodeData = {};
        for (const nodeName of nodeNames) {
          try {
            // First try item matching by index (available in Code nodes)
            let nodeItem = $fn(nodeName)?.itemMatching?.(itemIndex);
            
            // If that doesn't work, try the current item
            if (!nodeItem) {
              nodeItem = $fn(nodeName)?.item;
            }
            
            // If still no item, try getting from all items array
            if (!nodeItem) {
              const allNodeItems = $fn(nodeName)?.all();
              if (allNodeItems && allNodeItems.length > 0) {
                // Use the item at the current index, or the last available item
                nodeItem = allNodeItems[Math.min(itemIndex, allNodeItems.length - 1)];
                if (logErrors && itemIndex >= allNodeItems.length) {
                  console.warn(`Node '${nodeName}' has only ${allNodeItems.length} items, using last item for index ${itemIndex}`);
                }
              }
            }
            
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
        // Use camelCase parameter names for better JavaScript function signatures
        const camelCaseNodeData = {};
        const nodeDataParams = nodeNames.map(name => {
          const camelName = toCamelCase(name);
          const data = nodeData[name];
          camelCaseNodeData[camelName] = data;
          return data;
        });
        
        const processorArgs = [$item, $json, $itemIndex, ...nodeDataParams];
        const result = processor(...processorArgs);
        
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
    
    // Calculate statistics
    const stats = calculateStats(results, errors);
    
    return {
      results,
      errors,
      stats
    };
  }
  return {
    processItems
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
  toCamelCase, // Export for testing/debugging
  // Legacy exports (deprecated)
  processItemsWithPairing
};