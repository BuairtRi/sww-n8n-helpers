// src/n8n.js
// N8N-specific utility functions for workflow nodes

/**
 * Extract data from N8N nodes with error handling
 * @param {string|Array|Object} nodeNames - Node name(s) to extract data from
 * @param {Object} currentItem - Current item context (optional)
 * @returns {Object} Extracted node data with error handling
 */
function extractNodeData(nodeNames, currentItem = null) {
    const extracted = {};

    if (Array.isArray(nodeNames)) {
        // Handle array of node names
        nodeNames.forEach(nodeName => {
            try {
                // Use N8N's $() function to get node data
                const nodeData = $(nodeName);
                extracted[nodeName] = nodeData?.item?.json || null;
            } catch (error) {
                console.warn(`Failed to extract data from node '${nodeName}':`, error.message);
                extracted[nodeName] = null;
            }
        });
    } else if (typeof nodeNames === 'object' && nodeNames !== null) {
        // Handle object mapping: { alias: 'actualNodeName' }
        Object.entries(nodeNames).forEach(([key, nodeName]) => {
            try {
                const nodeData = $(nodeName);
                extracted[key] = nodeData?.item?.json || null;
            } catch (error) {
                console.warn(`Failed to extract data from node '${nodeName}' (alias: ${key}):`, error.message);
                extracted[key] = null;
            }
        });
    } else if (typeof nodeNames === 'string') {
        // Handle single node name
        try {
            const nodeData = $(nodeNames);
            extracted[nodeNames] = nodeData?.item?.json || null;
        } catch (error) {
            console.warn(`Failed to extract data from node '${nodeNames}':`, error.message);
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
 * @param {string|Array|Object} nodeNames - Node name(s) to extract all data from
 * @returns {Object} Extracted node data arrays with error handling
 */
function extractAllNodeData(nodeNames, options = {}) {
    const { includeMetadata = false } = options;
    const extracted = {};

    if (Array.isArray(nodeNames)) {
        nodeNames.forEach(nodeName => {
            try {
                const nodeData = $(nodeName);
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
                const nodeData = $(nodeName);
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
            const nodeData = $(nodeNames);
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
 * @param {string} nodeName - Name of the node
 * @param {string} path - Dot notation path to the data (e.g., 'json.title')
 * @param {*} fallback - Fallback value if path not found
 * @returns {*} Value at path or fallback
 */
function getNodeValue(nodeName, path = 'json', fallback = null) {
    try {
        const nodeData = $(nodeName);
        if (!nodeData?.item) return fallback;

        // Navigate the path
        const pathParts = path.split('.');
        let current = nodeData.item;

        for (const part of pathParts) {
            if (current && typeof current === 'object' && part in current) {
                current = current[part];
            } else {
                return fallback;
            }
        }

        return current !== undefined ? current : fallback;
    } catch (error) {
        console.warn(`Failed to get value from node '${nodeName}' at path '${path}':`, error.message);
        return fallback;
    }
}

/**
 * Check if nodes exist and have data
 * @param {string|Array} nodeNames - Node name(s) to check
 * @returns {Object} Status object with availability information
 */
function checkNodeAvailability(nodeNames) {
    const status = {
        available: {},
        hasData: {},
        errors: {}
    };

    const nodesToCheck = Array.isArray(nodeNames) ? nodeNames : [nodeNames];

    nodesToCheck.forEach(nodeName => {
        try {
            const nodeData = $(nodeName);
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

module.exports = {
    extractNodeData,
    extractAllNodeData,
    getNodeValue,
    checkNodeAvailability
}; 