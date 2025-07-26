// n8n Code Node: Group Knowledge Source Quality Check Configurations
// Groups SQL query results by KnowledgeSourceId using sww-n8n-helpers utilities

const { processItemsWithAccessors, validation } = require('sww-n8n-helpers');

const items = $input.all();

if (items.length === 0) {
    console.log('No items to process');
    return [];
}

console.log(`Processing ${items.length} quality check configurations from SQL query`);

// Helper function to format date using enhanced moment.js validation utilities
function formatDate(dateStr) {
    if (!dateStr) return null;
    
    // Try common SQL Server and ISO formats first for better parsing
    const formatted = validation.validateAndFormatDate(dateStr, {
        format: [
            'YYYY-MM-DD HH:mm:ss.SSS',  // SQL Server datetime
            'YYYY-MM-DD HH:mm:ss',      // SQL Server datetime2
            'YYYY-MM-DDTHH:mm:ss.SSSZ', // ISO with timezone
            'YYYY-MM-DDTHH:mm:ssZ',     // ISO without milliseconds
            'YYYY-MM-DD'                // Date only
        ]
    });
    
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

// Convert groups to output items for batch processing
const groupedItems = Array.from(sourceGroups.values()).map((group) => ({
    json: group
}));

// Process with modern batch processing and add summary info
const result = await processItemsWithAccessors(
    groupedItems,
    // Processor receives: $item, $json, $itemIndex
    (_$item, $json, _$itemIndex) => {
        const group = $json;

        // Add summary info
        group.summary = {
            knowledgeSourceName: group.knowledgeSource.name,
            sourceType: group.knowledgeSource.type,
            isActive: group.knowledgeSource.active,
            qualityCheckOperation: group.knowledgeOperation.name,
            configuredPrompts: Object.values(group.prompts).filter(p => p.template).length
        };

        return group;
    },
    {}, // No additional nodes needed
    {
        logErrors: true,
        stopOnError: false
    }
);

const results = result.results;

console.log(`Grouped into ${results.length} Knowledge Source configurations`);

// Log processing statistics
console.log(`Processing completed: ${result.stats.successful}/${result.stats.total} successful (${(result.stats.successRate * 100).toFixed(1)}%)`);
if (result.stats.failed > 0) {
    console.log(`Failed items: ${result.stats.failed}`);
    console.log('Error breakdown:', result.stats.errorBreakdown);
}

// Log summary using validation utilities for clean object handling
if (results.length > 0) {
    console.log('Quality Check Configurations:');
    results.forEach(item => {
        const summary = item.json.summary;
        console.log(`- ${summary.knowledgeSourceName} (${summary.sourceType}): ${summary.configuredPrompts} prompts configured`);
    });
}

return results;