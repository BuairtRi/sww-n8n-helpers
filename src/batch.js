// src/batch.js
// N8N-focused batch processing utilities with automatic context injection

const _ = require('lodash');
const { createN8NProcessingError, calculateErrorStats } = require('./error');
const { extractNodeData, getNodeValue } = require('./n8n');

/**
 * Validate that node data contains required fields
 * @param {Object} data - Node data to validate
 * @param {string} nodeName - Name of the node for logging
 * @param {number} attempt - Current attempt number
 * @param {boolean} logErrors - Whether to log validation failures
 * @returns {boolean} True if data is valid
 */
function validateNodeData(data, nodeName, attempt, logErrors) {
  if (!data || typeof data !== 'object') {
    return false;
  }
  
  // Special validation for source nodes that need knowledgeSourceId
  if (nodeName.toLowerCase().includes('source') && !data.knowledgeSourceId) {
    if (logErrors && attempt === 0) {
      console.warn(`Node '${nodeName}' missing knowledgeSourceId on attempt ${attempt + 1}, retrying...`);
    }
    return false;
  }
  
  return true;
}

/**
 * Try to get node item using different access methods
 * @param {string} nodeName - Name of the node
 * @param {number} itemIndex - Index of the item
 * @param {Function} $fn - N8N's $ function
 * @param {boolean} logErrors - Whether to log errors
 * @param {number} attempt - Current attempt number
 * @returns {Object|null} Node item data or null
 */
function tryGetNodeItem(nodeName, itemIndex, $fn, logErrors, attempt) {
  const nodeRef = $fn(nodeName);
  if (!nodeRef) return null;
  
  // Method 1: itemMatching by index
  let nodeItem = nodeRef.itemMatching?.(itemIndex);
  if (nodeItem?.json && validateNodeData(nodeItem.json, nodeName, attempt, logErrors)) {
    return nodeItem.json;
  }
  
  // Method 2: current item
  nodeItem = nodeRef.item;
  if (nodeItem?.json && validateNodeData(nodeItem.json, nodeName, attempt, logErrors)) {
    return nodeItem.json;
  }
  
  // Method 3: from all items array
  const allNodeItems = nodeRef.all();
  if (allNodeItems?.length > 0) {
    const actualIndex = Math.min(itemIndex, allNodeItems.length - 1);
    if (logErrors && itemIndex >= allNodeItems.length && attempt === 0) {
      console.warn(`Node '${nodeName}' has only ${allNodeItems.length} items, using last item for index ${itemIndex}`);
    }
    
    nodeItem = allNodeItems[actualIndex];
    if (nodeItem?.json && validateNodeData(nodeItem.json, nodeName, attempt, logErrors)) {
      return nodeItem.json;
    }
  }
  
  return null;
}

/**
 * Safely retrieve node data with retry logic to handle n8n race conditions
 * @param {string} nodeName - Name of the node to retrieve data from
 * @param {number} itemIndex - Index of the item to retrieve
 * @param {Function} $fn - N8N's $ function
 * @param {boolean} logErrors - Whether to log errors
 * @param {number} maxRetries - Maximum number of retries
 * @returns {Promise<Object|null>} Node data or null if unavailable
 */
async function safeGetNodeData(nodeName, itemIndex, $fn, logErrors = true, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const data = tryGetNodeItem(nodeName, itemIndex, $fn, logErrors, attempt);
      if (data) {
        return data;
      }
      
      // If no data and not the last attempt, wait and retry
      if (attempt < maxRetries - 1) {
        const waitTime = Math.min(50 * Math.pow(2, attempt), 500);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
    } catch (error) {
      if (logErrors && attempt === maxRetries - 1) {
        console.warn(`Error accessing node '${nodeName}' on attempt ${attempt + 1}:`, error.message);
      }
      
      // If not the last attempt, wait and retry
      if (attempt < maxRetries - 1) {
        const waitTime = Math.min(50 * Math.pow(2, attempt), 500);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  return null;
}

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
 * Create error result object for failed item processing
 * @param {Error} error - The error that occurred
 * @param {Object} item - The item that failed processing
 * @param {number} itemIndex - Index of the failed item
 * @param {boolean} logErrors - Whether to log the error
 * @returns {Object} Error result object with pairedItem
 */
function createErrorResult(error, item, itemIndex, logErrors) {
  return createN8NProcessingError(error, item, itemIndex, logErrors);
}

/**
 * Process a single item with node data extraction and error handling
 * @param {Object} item - N8N item to process
 * @param {number} itemIndex - Index of the item
 * @param {Function} processor - Processing function
 * @param {Array} nodeNames - Node names to extract data from
 * @param {Function} $fn - N8N's $ function
 * @param {boolean} logErrors - Whether to log errors
 * @returns {Promise<Object>} Processing result
 */
async function processSingleItem(item, itemIndex, processor, nodeNames, $fn, logErrors) {
  // Extract node data for this item index with defensive access
  const nodeData = {};
  for (const nodeName of nodeNames) {
    try {
      nodeData[nodeName] = await safeGetNodeData(nodeName, itemIndex, $fn, logErrors);
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
  const camelCaseNodeData = {};
  const nodeDataParams = nodeNames.map(name => {
    const camelName = toCamelCase(name);
    const data = nodeData[name];
    camelCaseNodeData[camelName] = data;
    return data;
  });
  
  const processorArgs = [$item, $json, $itemIndex, ...nodeDataParams];
  const result = processor(...processorArgs);
  
  return {
    json: result,
    pairedItem: itemIndex
  };
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
   * @returns {Promise<Object>} Processing results with items, errors, and stats
   */
  async function processItems(items, processor, nodeNames = [], options = {}) {
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
    
    // Add explicit synchronization delay once at the start to allow n8n state to settle
    await new Promise(resolve => setTimeout(resolve, 150));
    
    const results = [];
    const errors = [];
    
    // Process all items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemIndex = i;
      
      try {
        const result = await processSingleItem(item, itemIndex, processor, nodeNames, $fn, logErrors);
        results.push(result);
        
      } catch (error) {
        const errorResult = createErrorResult(error, item, itemIndex, logErrors);
        results.push(errorResult.result);
        errors.push(errorResult.errorInfo);
        
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
 * Process n8n items with node accessor functions to preserve itemMatching behavior
 * @param {Array} items - N8N items from $input.all() or $('NodeName').all()
 * @param {Function} processor - Processing function that receives: ($item, $json, $itemIndex, ...nodeData)
 * @param {Object} nodeAccessors - Object with node names as keys and accessor functions as values
 *   Example: { 'Ingestion Sources': (itemIndex) => $('Ingestion Sources').itemMatching(itemIndex)?.json }
 * @param {Object} options - Processing options
 * @param {boolean} options.logErrors - Log processing errors (default: true)
 * @param {boolean} options.stopOnError - Stop processing on first error (default: false)
 * @returns {Promise<Object>} Processing results with items, errors, and stats
 */
async function processItemsWithAccessors(items, processor, nodeAccessors = {}, options = {}) {
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
  
  if (typeof nodeAccessors !== 'object' || nodeAccessors === null) {
    throw new Error('NodeAccessors must be an object with node names as keys and accessor functions as values');
  }
  
  // Add explicit synchronization delay once at the start to allow n8n state to settle
  await new Promise(resolve => setTimeout(resolve, 150));
  
  const results = [];
  const errors = [];
  const nodeNames = Object.keys(nodeAccessors);
  
  // Process all items
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const itemIndex = i;
    
    try {
      // Call accessor functions with current item index
      const nodeData = {};
      const nodeDataArray = [];
      
      for (const nodeName of nodeNames) {
        const accessor = nodeAccessors[nodeName];
        if (typeof accessor !== 'function') {
          throw new Error(`Accessor for node '${nodeName}' must be a function`);
        }
        
        try {
          const data = accessor(itemIndex);
          const camelName = toCamelCase(nodeName);
          nodeData[camelName] = data;
          nodeDataArray.push(data);
        } catch (nodeError) {
          if (logErrors) {
            console.warn(`Failed to extract data from node '${nodeName}' for item ${itemIndex}:`, nodeError.message);
          }
          const camelName = toCamelCase(nodeName);
          nodeData[camelName] = null;
          nodeDataArray.push(null);
        }
      }
      
      // Create context variables for the processor
      const $item = item;
      const $json = item.json || item;
      const $itemIndex = itemIndex;
      
      // Call processor with context variables and node data as parameters
      const processorArgs = [$item, $json, $itemIndex, ...nodeDataArray];
      const result = processor(...processorArgs);
      
      results.push({
        json: result,
        pairedItem: itemIndex
      });
      
    } catch (error) {
      const errorResult = createErrorResult(error, item, itemIndex, logErrors);
      results.push(errorResult.result);
      errors.push(errorResult.errorInfo);
      
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

/**
 * Calculate processing statistics
 * @private
 */
function calculateStats(results, errors) {
  return calculateErrorStats(results, errors);
}

module.exports = {
  processItemsWithN8N,
  processItemsWithAccessors,
  toCamelCase
};