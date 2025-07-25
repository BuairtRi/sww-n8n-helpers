// n8n Code Node: Group Knowledge Source Quality Check Configurations
// Groups SQL query results by KnowledgeSourceId

const items = $input.all();
const outputItems = [];

if (items.length === 0) {
    console.log('No items to process');
    return [];
}

console.log(`Processing ${items.length} quality check configurations from SQL query`);

// Helper function to format date
function formatDate(dateStr) {
    if (!dateStr) return null;
    try {
        return new Date(dateStr).toISOString();
    } catch {
        return dateStr;
    }
}

// Group items by KnowledgeSourceId
const sourceGroups = {};

for (const item of items) {
    const sourceId = item.json.KnowledgeSourceId;

    if (!sourceGroups[sourceId]) {
        // Initialize group with all the data from first record
        sourceGroups[sourceId] = {
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

            // Store all 5 prompt configurations
            prompts: {
                prompt1: {
                    template: item.json.Prompt1,
                    model: item.json.Prompt1Model,
                    modelProvider: item.json.Prompt1Provider,
                    temperature: item.json.Prompt1Temperature,
                    maxTokens: item.json.Prompt1MaxTokens
                },
                prompt2: {
                    template: item.json.Prompt2,
                    model: item.json.Prompt2Model,
                    modelProvider: item.json.Prompt2ModelProvider,
                    temperature: item.json.Prompt2Temperature,
                    maxTokens: item.json.Prompt2MaxTokens
                },
                prompt3: {
                    template: item.json.Prompt3Prompt,
                    model: item.json.Prompt3Model,
                    modelProvider: item.json.Prompt3ModelProvider,
                    temperature: item.json.Prompt3Temperature,
                    maxTokens: item.json.Prompt3MaxTokens
                },
                prompt4: {
                    template: item.json.Prompt4,
                    model: item.json.Prompt4Model,
                    modelProvider: item.json.Prompt4ModelProvider,
                    temperature: item.json.Prompt4Temperature,
                    maxTokens: item.json.Prompt4MaxTokens
                },
                prompt5: {
                    template: item.json.Prompt5,
                    model: item.json.Prompt5Model,
                    modelProvider: item.json.Prompt5ModelProvider,
                    temperature: item.json.Prompt5Temperature,
                    maxTokens: item.json.Prompt5MaxTokens
                }
            }
        };
    }
}

// Convert groups to output items
let itemIndex = 0;
for (const [sourceId, group] of Object.entries(sourceGroups)) {
    // Add summary info
    group.summary = {
        knowledgeSourceName: group.knowledgeSource.name,
        sourceType: group.knowledgeSource.type,
        isActive: group.knowledgeSource.active,
        qualityCheckOperation: group.knowledgeOperation.name,
        configuredPrompts: Object.values(group.prompts).filter(p => p.template).length
    };

    outputItems.push({
        json: group,
        pairedItem: itemIndex
    });
    itemIndex++;
}

console.log(`Grouped into ${outputItems.length} Knowledge Source configurations`);

// Log summary
if (outputItems.length > 0) {
    console.log('Quality Check Configurations:');
    outputItems.forEach(item => {
        console.log(`- ${item.json.summary.knowledgeSourceName} (${item.json.summary.sourceType}): ${item.json.summary.configuredPrompts} prompts configured`);
    });
}

return outputItems;