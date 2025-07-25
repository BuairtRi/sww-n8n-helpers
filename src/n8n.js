// src/n8n.js
// N8N-specific utility functions for workflow nodes
// These functions accept the N8N $ function as a parameter since it's only available in Code node context

/**
 * Extract data from N8N nodes with error handling
 * @param {Function} $fn - N8N's $ function (pass $ from Code node context)
 * @param {string|Array|Object} nodeNames - Node name(s) to extract data from
 * @param {Object} currentItem - Current item context (optional)
 * @param {number} itemIndex - Index of current item being processed (for proper N8N item pairing)
 * @returns {Object} Extracted node data with error handling
 */
function extractNodeData($fn, nodeNames, currentItem = null, itemIndex = 0) {
    const extracted = {};

    if (Array.isArray(nodeNames)) {
        // Handle array of node names
        nodeNames.forEach(nodeName => {
            try {
                // Use N8N's $() function passed as parameter
                const nodeData = $fn(nodeName);
                // ✅ Use correct N8N API with cleaner optional chaining syntax
                extracted[nodeName] = nodeData?.itemMatching(itemIndex)?.json || nodeData?.item?.json || null;
            } catch (error) {
                console.warn(`Failed to extract data from node '${nodeName}' at index ${itemIndex}:`, error.message);
                extracted[nodeName] = null;
            }
        });
    } else if (typeof nodeNames === 'object' && nodeNames !== null) {
        // Handle object mapping: { alias: 'actualNodeName' }
        Object.entries(nodeNames).forEach(([key, nodeName]) => {
            try {
                const nodeData = $fn(nodeName);
                // ✅ Use correct N8N API with cleaner optional chaining syntax
                extracted[key] = nodeData?.itemMatching(itemIndex)?.json || nodeData?.item?.json || null;
            } catch (error) {
                console.warn(`Failed to extract data from node '${nodeName}' (alias: ${key}) at index ${itemIndex}:`, error.message);
                extracted[key] = null;
            }
        });
    } else if (typeof nodeNames === 'string') {
        // Handle single node name
        try {
            const nodeData = $fn(nodeNames);
            // ✅ Use correct N8N API with cleaner optional chaining syntax
            extracted[nodeNames] = nodeData?.itemMatching(itemIndex)?.json || nodeData?.item?.json || null;
        } catch (error) {
            console.warn(`Failed to extract data from node '${nodeNames}' at index ${itemIndex}:`, error.message);
            extracted[nodeNames] = null;
        }
    }

    // Add current item if provided
    if (currentItem) {
        extracted.current = currentItem.json || currentItem;
    }

    return extracted;
}

/**
 * Extract all items from specified N8N nodes
 * @param {Function} $fn - N8N's $ function (pass $ from Code node context)
 * @param {string|Array|Object} nodeNames - Node name(s) to extract all data from
 * @param {Object} options - Extraction options
 * @returns {Object} Extracted node data arrays with error handling
 */
function extractAllNodeData($fn, nodeNames, options = {}) {
    const { includeMetadata = false } = options;
    const extracted = {};

    if (Array.isArray(nodeNames)) {
        nodeNames.forEach(nodeName => {
            try {
                const nodeData = $fn(nodeName);
                extracted[nodeName] = nodeData?.all?.() || [];

                if (includeMetadata) {
                    extracted[`${nodeName}_metadata`] = {
                        count: extracted[nodeName].length,
                        hasData: extracted[nodeName].length > 0
                    };
                }
            } catch (error) {
                console.warn(`Failed to extract all data from node '${nodeName}':`, error.message);
                extracted[nodeName] = [];

                if (includeMetadata) {
                    extracted[`${nodeName}_metadata`] = {
                        count: 0,
                        hasData: false,
                        error: error.message
                    };
                }
            }
        });
    } else if (typeof nodeNames === 'object' && nodeNames !== null) {
        Object.entries(nodeNames).forEach(([key, nodeName]) => {
            try {
                const nodeData = $fn(nodeName);
                extracted[key] = nodeData?.all?.() || [];

                if (includeMetadata) {
                    extracted[`${key}_metadata`] = {
                        count: extracted[key].length,
                        hasData: extracted[key].length > 0
                    };
                }
            } catch (error) {
                console.warn(`Failed to extract all data from node '${nodeName}' (alias: ${key}):`, error.message);
                extracted[key] = [];

                if (includeMetadata) {
                    extracted[`${key}_metadata`] = {
                        count: 0,
                        hasData: false,
                        error: error.message
                    };
                }
            }
        });
    } else if (typeof nodeNames === 'string') {
        try {
            const nodeData = $fn(nodeNames);
            extracted[nodeNames] = nodeData?.all?.() || [];

            if (includeMetadata) {
                extracted[`${nodeNames}_metadata`] = {
                    count: extracted[nodeNames].length,
                    hasData: extracted[nodeNames].length > 0
                };
            }
        } catch (error) {
            console.warn(`Failed to extract all data from node '${nodeNames}':`, error.message);
            extracted[nodeNames] = [];

            if (includeMetadata) {
                extracted[`${nodeNames}_metadata`] = {
                    count: 0,
                    hasData: false,
                    error: error.message
                };
            }
        }
    }

    return extracted;
}

/**
 * Safely get node data with fallback values
 * @param {Function} $fn - N8N's $ function (pass $ from Code node context)
 * @param {string} nodeName - Name of the node
 * @param {string} path - Dot notation path to the data (e.g., 'json.title')
 * @param {*} fallback - Fallback value if path not found
 * @param {number} itemIndex - Index of current item being processed (for proper N8N item pairing)
 * @returns {*} Value at path or fallback
 */
function getNodeValue($fn, nodeName, path = 'json', fallback = null, itemIndex = 0) {
    try {
        const nodeData = $fn(nodeName);

        // ✅ Use cleaner optional chaining syntax
        const item = nodeData?.itemMatching(itemIndex) || nodeData?.item;
        if (!item) return fallback;

        // Navigate the path
        const pathParts = path.split('.');
        let current = item;

        for (const part of pathParts) {
            if (current && typeof current === 'object' && part in current) {
                current = current[part];
            } else {
                return fallback;
            }
        }

        return current !== undefined ? current : fallback;
    } catch (error) {
        console.warn(`Failed to get value from node '${nodeName}' at path '${path}' (itemIndex: ${itemIndex}):`, error.message);
        return fallback;
    }
}

/**
 * Check if nodes exist and have data
 * @param {Function} $fn - N8N's $ function (pass $ from Code node context)
 * @param {string|Array} nodeNames - Node name(s) to check
 * @returns {Object} Status object with availability information
 */
function checkNodeAvailability($fn, nodeNames) {
    const status = {
        available: {},
        hasData: {},
        errors: {}
    };

    const nodesToCheck = Array.isArray(nodeNames) ? nodeNames : [nodeNames];

    nodesToCheck.forEach(nodeName => {
        try {
            const nodeData = $fn(nodeName);
            status.available[nodeName] = !!nodeData;
            status.hasData[nodeName] = !!(nodeData?.item?.json);

            if (!nodeData?.item?.json) {
                status.errors[nodeName] = 'Node exists but has no data';
            }
        } catch (error) {
            status.available[nodeName] = false;
            status.hasData[nodeName] = false;
            status.errors[nodeName] = error.message;
        }
    });

    return status;
}

/**
 * Create N8N-ready helper functions that have $ pre-bound
 * Use this in your N8N Code node to create convenience functions
 * @param {Function} $fn - N8N's $ function from Code node context
 * @returns {Object} Helper functions with $ pre-bound
 */
function createN8NHelpers($fn) {
    return {
        extractNodeData: (nodeNames, currentItem = null, itemIndex = 0) => extractNodeData($fn, nodeNames, currentItem, itemIndex),
        extractAllNodeData: (nodeNames, options = {}) => extractAllNodeData($fn, nodeNames, options),
        getNodeValue: (nodeName, path = 'json', fallback = null, itemIndex = 0) => getNodeValue($fn, nodeName, path, fallback, itemIndex),
        checkNodeAvailability: (nodeNames) => checkNodeAvailability($fn, nodeNames)
    };
}

module.exports = {
    extractNodeData,
    extractAllNodeData,
    getNodeValue,
    checkNodeAvailability,
    createN8NHelpers
}; 