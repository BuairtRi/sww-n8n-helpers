// n8n Code Node: Group Knowledge Source Quality Check Configurations
// Groups SQL query results by KnowledgeSourceId using sww-n8n-helpers utilities

const { processItemsWithPairing, validation } = require('sww-n8n-helpers');

const items = $input.all();

if (items.length === 0) {
    console.log('No items to process');
    return [];
}

console.log(`Processing ${items.length} quality check configurations from SQL query`);

// Helper function to format date using validation utilities
function formatDate(dateStr) {
    if (!dateStr) return null;
    const formatted = validation.validateAndFormatDate(dateStr);
    return formatted || dateStr; // Return original if validation fails
}

// Helper function to create prompt configuration object with safe fallback chains
function createPromptConfig(item, promptNumber) {
    const data = item.json;

    return {
        template: validation.createFallbackChain(data, [
            `Prompt${promptNumber}`,
            `Prompt${promptNumber}Prompt`
        ], null),
        model: validation.createFallbackChain(data, [
            `Prompt${promptNumber}Model`
        ], null),
        modelProvider: validation.createFallbackChain(data, [
            `Prompt${promptNumber}Provider`,
            `Prompt${promptNumber}ModelProvider`
        ], null),
        temperature: data[`Prompt${promptNumber}Temperature`] ?? null,
        maxTokens: data[`Prompt${promptNumber}MaxTokens`] ?? null
    };
}

// Group items by KnowledgeSourceId using a Map for O(1) lookups
const sourceGroups = new Map();

// Process all items and group by source ID
items.forEach(item => {
    const sourceId = item.json.KnowledgeSourceId;

    if (!sourceGroups.has(sourceId)) {
        // Initialize group with all the data from first record
        const group = {
            // Core ID
            knowledgeSourceId: sourceId,

            // Quality Check Operation Configuration
            knowledgeOperation: {
                name: item.json.KnowledgeOperationName,
                type: item.json.KnowledgeOperationType,
                operationId: item.json.KnowledgeOperationId,
                targetLength: item.json.KnowledgeOperationTargetLength,
                typeId: item.json.KnowledgeOperationTypeId,
                retentionInterval: item.json.RetentionInterval
            },

            // KnowledgeSource metadata
            knowledgeSource: {
                name: item.json.KnowledgeSourceName,
                typeId: item.json.KnowledgeSourceTypeId,
                type: item.json.KnowledgeSourceType,
                url: item.json.KnowledgeSourceUrl,
                active: item.json.SourceActive,
                sourceId: item.json.SourceId,
                detectInterval: item.json.DetectInterval,
                lastDetectDate: formatDate(item.json.LastDetectDate),
                nextDetectDate: formatDate(item.json.NextDetectDate),
                detect: item.json.Detect
            },

            // Store all 5 prompt configurations using helper function
            prompts: {
                prompt1: createPromptConfig(item, '1'),
                prompt2: createPromptConfig(item, '2'),
                prompt3: createPromptConfig(item, '3'),
                prompt4: createPromptConfig(item, '4'),
                prompt5: createPromptConfig(item, '5')
            }
        };

        sourceGroups.set(sourceId, group);
    }
});

// Convert groups to output items using processItemsWithPairing for consistency
const groupedItems = Array.from(sourceGroups.values()).map((group, index) => ({
    json: group,
    index: index
}));

// Process with pairing and add summary info
const results = processItemsWithPairing(groupedItems, (item, index) => {
    const group = item.json;

    // Add summary info
    group.summary = {
        knowledgeSourceName: group.knowledgeSource.name,
        sourceType: group.knowledgeSource.type,
        isActive: group.knowledgeSource.active,
        qualityCheckOperation: group.knowledgeOperation.name,
        configuredPrompts: Object.values(group.prompts).filter(p => p.template).length
    };

    return group;
}, {
    maintainPairing: true,
    logErrors: true,
    stopOnError: false
});

console.log(`Grouped into ${results.length} Knowledge Source configurations`);

// Log summary using validation utilities for clean object handling
if (results.length > 0) {
    console.log('Quality Check Configurations:');
    results.forEach(item => {
        const summary = item.json.summary;
        console.log(`- ${summary.knowledgeSourceName} (${summary.sourceType}): ${summary.configuredPrompts} prompts configured`);
    });
}

return results;