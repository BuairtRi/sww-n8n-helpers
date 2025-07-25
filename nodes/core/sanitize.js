// n8n Code Node: Enhanced SQL Text Sanitization
// Sanitizes text strings for safe SQL queries and prevents injection attacks
// Now supports objectToSanitize and selective field sanitization

const items = $input.all();
const outputItems = [];

// Core sanitization function
function sanitizeForSQL(text, options = {}) {
    const {
        maxLength = null,
        allowNewlines = true,
        preserveBasicFormatting = false,
        strictMode = false
    } = options;

    // Handle null/undefined
    if (text === null || text === undefined) {
        return null;
    }

    // Convert to string if needed
    if (typeof text !== 'string') {
        // If it's an object, convert to JSON string instead of "[object Object]"
        if (typeof text === 'object' && text !== null) {
            text = JSON.stringify(text);
        }
        // If processing a single text field (FALLBACK)
        else if (inputData.textToSanitize !== undefined) {
            const fieldType = inputData.fieldType || 'default';
            const maxLength = inputData.maxLength || null;

            const sanitized = sanitizeByFieldType(inputData.textToSanitize, fieldType, maxLength);
            const validation = validateSanitizedText(inputData.textToSanitize, sanitized, 'textToSanitize');

            outputItems.push({
                json: {
                    original: inputData.textToSanitize,
                    sanitized: sanitized,
                    fieldType: fieldType,
                    validation: validation,
                    processingMetadata: {
                        sanitizedAt: new Date().toISOString(),
                        itemIndex: i,
                        lengthChange: inputData.textToSanitize ?
                            inputData.textToSanitize.length - (sanitized ? sanitized.length : 0) : 0
                    }
                },
                pairedItem: i
            });
        } else {
            text = String(text);
        }
    }

    // Trim whitespace
    text = text.trim();

    // Return null for empty strings
    if (text === '') {
        return null;
    }

    // Truncate if max length specified and is a positive number
    if (maxLength && maxLength > 0 && text.length > maxLength) {
        text = text.substring(0, maxLength - 3) + '...';
    }

    // Basic SQL injection prevention - escape single quotes
    text = text.replace(/'/g, "''");

    // Handle other potentially dangerous characters
    text = text.replace(/\\/g, "\\\\"); // Escape backslashes
    text = text.replace(/\0/g, "");     // Remove null characters
    text = text.replace(/\x1a/g, "");   // Remove substitute characters

    // In strict mode, be more aggressive
    if (strictMode) {
        // Remove potential SQL keywords at string boundaries (case insensitive)
        const dangerousPatterns = [
            /^\s*(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT|DECLARE|CAST|CONVERT)\s+/gi,
            /;\s*(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT|DECLARE|CAST|CONVERT)\s+/gi,
            /--\s*$/gm,  // SQL comments at end of lines
            /\/\*.*?\*\//gs, // Block comments
            /<script[^>]*>.*?<\/script>/gis, // Script tags
            /<iframe[^>]*>.*?<\/iframe>/gis, // Iframe tags
        ];

        dangerousPatterns.forEach(pattern => {
            text = text.replace(pattern, '');
        });
    }

    // Handle newlines based on preference
    if (!allowNewlines) {
        text = text.replace(/[\r\n]+/g, ' ');
    } else {
        // Normalize line endings
        text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    }

    // Clean up extra whitespace
    text = text.replace(/\s+/g, ' ').trim();

    return text;
}

// Enhanced sanitization for different field types
function sanitizeByFieldType(text, fieldType, maxLength = null) {
    // Normalize maxLength - treat null, undefined, 0, or negative numbers as unlimited
    const effectiveMaxLength = (maxLength === null || maxLength === undefined || maxLength <= 0) ? null : maxLength;
    const baseOptions = { maxLength: effectiveMaxLength };

    switch (fieldType.toLowerCase()) {
        case 'title':
        case 'name':
        case 'subject':
            return sanitizeForSQL(text, {
                ...baseOptions,
                maxLength: effectiveMaxLength || 250, // Default limit for titles
                allowNewlines: false,
                strictMode: true
            });

        case 'description':
        case 'content':
        case 'summary':
            return sanitizeForSQL(text, {
                ...baseOptions,
                maxLength: effectiveMaxLength, // Use effective length (unlimited if null/undefined/0)
                allowNewlines: true,
                preserveBasicFormatting: true,
                strictMode: false
            });

        case 'url':
        case 'link':
            // URLs need special handling
            if (!text) return null;
            const cleanUrl = text.trim().replace(/['"\s]/g, '');
            return sanitizeForSQL(cleanUrl, {
                maxLength: effectiveMaxLength || 2000, // Default URL limit
                allowNewlines: false,
                strictMode: true
            });

        case 'email':
            if (!text) return null;
            const cleanEmail = text.trim().toLowerCase().replace(/['";\s]/g, '');
            return sanitizeForSQL(cleanEmail, {
                maxLength: effectiveMaxLength || 255, // Default email limit
                allowNewlines: false,
                strictMode: true
            });

        case 'json':
            // For JSON strings, be extra careful
            if (!text) return null;
            try {
                // Validate it's actually JSON
                JSON.parse(text);
                return sanitizeForSQL(text, {
                    ...baseOptions,
                    allowNewlines: true,
                    strictMode: false
                });
            } catch (e) {
                console.warn('Invalid JSON provided for sanitization:', e.message);
                return sanitizeForSQL(text, {
                    ...baseOptions,
                    allowNewlines: true,
                    strictMode: true
                });
            }

        default:
            return sanitizeForSQL(text, {
                ...baseOptions,
                allowNewlines: true,
                strictMode: false
            });
    }
}

// Parse field list from comma-delimited string
function parseFieldList(fieldListString) {
    if (!fieldListString || typeof fieldListString !== 'string') {
        return null; // null means "process all fields"
    }

    return fieldListString
        .split(',')
        .map(field => field.trim())
        .filter(field => field.length > 0);
}

// Batch sanitization function for multiple fields with selective processing
function sanitizeObject(obj, fieldMappings = {}, fieldsToProcess = null) {
    const sanitized = {};

    // If fieldsToProcess is null, process all string fields
    // If it's an array, only process those fields
    const shouldProcessField = (key) => {
        if (fieldsToProcess === null) return true;
        return fieldsToProcess.includes(key);
    };

    for (const [key, value] of Object.entries(obj)) {
        // Only process if it's in our field list and is a string-like value
        if (shouldProcessField(key) && (value !== null && value !== undefined)) {
            // Determine field type and max length from mappings
            const fieldConfig = fieldMappings[key] || {};
            const fieldType = fieldConfig.type || 'default';
            const maxLength = fieldConfig.maxLength || null;

            // Add sanitized version only
            sanitized[`${key}Sanitized`] = sanitizeByFieldType(value, fieldType, maxLength);
        } else if (shouldProcessField(key)) {
            // Field was in the list but is null/undefined
            sanitized[`${key}Sanitized`] = null;
        }
    }

    return sanitized;
}

// Validation function to check for potential issues
function validateSanitizedText(original, sanitized, fieldName = 'text') {
    const issues = [];

    if (original && !sanitized) {
        issues.push(`${fieldName}: Text was completely removed during sanitization`);
    }

    if (original && sanitized && original.length > sanitized.length * 2) {
        issues.push(`${fieldName}: Text was significantly truncated (${original.length} -> ${sanitized.length} chars)`);
    }

    if (sanitized && sanitized.includes('...')) {
        issues.push(`${fieldName}: Text was truncated due to length limits`);
    }

    return issues;
}

// Process each item
for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const inputData = item.json;

    try {
        // Default field mappings based on your schema
        const defaultFieldMappings = {
            // Topic fields
            Topic: { type: 'title', maxLength: 250 },
            PodcastPrompt: { type: 'content', maxLength: null },
            DigestPrompt: { type: 'content', maxLength: null },
            ResearchBriefPrompt: { type: 'content', maxLength: null },

            // Knowledge Source fields
            Name: { type: 'name', maxLength: 250 },
            Url: { type: 'url', maxLength: 2000 },
            SourceId: { type: 'default', maxLength: 500 },

            // Knowledge Source Instance fields
            Title: { type: 'title', maxLength: 250 },
            Subtitle: { type: 'title', maxLength: 250 },
            Author: { type: 'name', maxLength: 500 },
            SourceSummary: { type: 'summary', maxLength: null }, // Unlimited
            SourceDescription: { type: 'description', maxLength: null }, // Unlimited
            SourceUrl: { type: 'url', maxLength: 2000 },
            SourceLink: { type: 'url', maxLength: 4000 },
            SourceImageUrl: { type: 'url', maxLength: 4000 },

            // Text fields
            Text: { type: 'content', maxLength: null }, // Unlimited
            Type: { type: 'name', maxLength: 50 },

            // Common fields
            subject: { type: 'title', maxLength: 250 },
            title: { type: 'title', maxLength: 250 },
            description: { type: 'description', maxLength: null }, // Unlimited
            content: { type: 'content', maxLength: null }, // Unlimited
            summary: { type: 'summary', maxLength: null }, // Unlimited
            email: { type: 'email', maxLength: 255 },
            url: { type: 'url', maxLength: 2000 },
            link: { type: 'url', maxLength: 2000 }
        };

        // Allow custom field mappings from input
        const fieldMappings = inputData.fieldMappings || defaultFieldMappings;

        // Parse the field list if provided
        const fieldsToProcess = parseFieldList(inputData.fieldsToSanitize);

        // If processing an object passed via objectToSanitize (HIGHEST PRIORITY)
        if (inputData.objectToSanitize !== undefined) {
            let objectToProcess;

            // Handle objectToSanitize - might be a string or already an object
            if (typeof inputData.objectToSanitize === 'string') {
                try {
                    objectToProcess = JSON.parse(inputData.objectToSanitize);
                } catch (e) {
                    throw new Error(`Failed to parse objectToSanitize as JSON: ${e.message}`);
                }
            } else if (typeof inputData.objectToSanitize === 'object' && inputData.objectToSanitize !== null) {
                objectToProcess = inputData.objectToSanitize;
            } else {
                throw new Error('objectToSanitize must be a JSON string or object');
            }

            const sanitizedObject = sanitizeObject(objectToProcess, fieldMappings, fieldsToProcess);

            // Collect validation issues
            const allValidationIssues = [];
            const processedFields = [];

            for (const [key, value] of Object.entries(objectToProcess)) {
                const shouldProcess = fieldsToProcess === null || fieldsToProcess.includes(key);
                if (shouldProcess && (typeof value === 'string' || (value !== null && value !== undefined))) {
                    processedFields.push(key);
                    const sanitizedKey = `${key}Sanitized`;
                    if (sanitizedObject[sanitizedKey] !== undefined) {
                        const issues = validateSanitizedText(value, sanitizedObject[sanitizedKey], key);
                        allValidationIssues.push(...issues);
                    }
                }
            }

            // Add processing metadata
            sanitizedObject.processingMetadata = {
                sanitizedAt: new Date().toISOString(),
                itemIndex: i,
                validationIssues: allValidationIssues,
                fieldsProcessed: processedFields,
                fieldsRequested: fieldsToProcess,
                totalFieldsInObject: Object.keys(objectToProcess).length
            };

            outputItems.push({
                json: sanitizedObject,
                pairedItem: i
            });
        }
        // If processing multiple fields in the main input object
        else {
            const sanitizedObject = sanitizeObject(inputData, fieldMappings, fieldsToProcess);

            // Collect validation issues
            const allValidationIssues = [];
            const processedFields = [];

            for (const [key, value] of Object.entries(inputData)) {
                const shouldProcess = fieldsToProcess === null || fieldsToProcess.includes(key);
                if (shouldProcess && (typeof value === 'string' || (value !== null && value !== undefined))) {
                    processedFields.push(key);
                    const sanitizedKey = `${key}Sanitized`;
                    if (sanitizedObject[sanitizedKey] !== undefined) {
                        const issues = validateSanitizedText(value, sanitizedObject[sanitizedKey], key);
                        allValidationIssues.push(...issues);
                    }
                }
            }

            // Add processing metadata
            sanitizedObject.processingMetadata = {
                sanitizedAt: new Date().toISOString(),
                itemIndex: i,
                validationIssues: allValidationIssues,
                fieldsProcessed: processedFields,
                fieldsRequested: fieldsToProcess,
                totalFieldsInInput: Object.keys(inputData).length
            };

            outputItems.push({
                json: sanitizedObject,
                pairedItem: i
            });
        }

    } catch (error) {
        console.error(`Sanitization failed for item ${i}:`, error.message);

        // Output error item to maintain pairing
        outputItems.push({
            json: {
                _error: {
                    type: 'sanitization_error',
                    message: error.message,
                    originalData: {
                        keys: Object.keys(inputData),
                        hasTextToSanitize: inputData.textToSanitize !== undefined,
                        hasObjectToSanitize: inputData.objectToSanitize !== undefined,
                        fieldsToSanitize: inputData.fieldsToSanitize
                    }
                },
                processingMetadata: {
                    sanitizedAt: new Date().toISOString(),
                    itemIndex: i,
                    failed: true
                }
            },
            pairedItem: i
        });
    }
}

console.log(`Sanitized ${outputItems.length} items`);

return outputItems;