// n8n Code Node: Reusable HTTP Request Validator
const inputItems = $input.all();
const outputItems = [];

// Extract configuration from incoming data
function getConfig(input) {
    return {
        // Comma-delimited string of required fields from input
        requiredFields: input.requiredFields || '',

        // Field validation rules from input (already an object)
        fieldRules: input.fieldRules || {},

        // Default configuration options
        extractFromBody: true,
        maxStringLength: 2000,
        trimStrings: true
    };
}

// Helper Functions
function parseDate(dateStr) {
    if (!dateStr) return null;

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
        throw new Error(`Invalid date format: ${dateStr}`);
    }

    return date.toISOString();
}

function isValidGuid(guid) {
    if (!guid || typeof guid !== 'string') return false;

    const cleanGuid = guid.replace(/-/g, '');
    const guidRegex = /^[0-9a-f]{32}$/i;
    return guidRegex.test(cleanGuid);
}

function isValidUrl(url) {
    if (!url || typeof url !== 'string') return false;

    const urlRegex = /^https?:\/\/(?:[-\w.])+(?::[0-9]+)?(?:\/(?:[\w\/_.])*)?(?:\?(?:[\w&=%.])*)?(?:#(?:[\w.])*)?$/i;
    return urlRegex.test(url);
}

function isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validateField(fieldName, value, rule) {
    const errors = [];

    // Skip validation if value is null/undefined and field is not required
    if ((value === null || value === undefined || value === '') && !rule.required) {
        return errors;
    }

    // Type validation
    switch (rule.type) {
        case 'string':
            if (typeof value !== 'string') {
                errors.push(`${fieldName} must be a string`);
            } else {
                if (rule.maxLength && value.length > rule.maxLength) {
                    errors.push(`${fieldName} must be no more than ${rule.maxLength} characters`);
                }
                if (rule.minLength && value.length < rule.minLength) {
                    errors.push(`${fieldName} must be at least ${rule.minLength} characters`);
                }
                if (rule.pattern && !new RegExp(rule.pattern).test(value)) {
                    errors.push(`${fieldName} does not match required pattern`);
                }
            }
            break;

        case 'number':
            if (typeof value !== 'number' && !Number.isFinite(Number(value))) {
                errors.push(`${fieldName} must be a valid number`);
            } else {
                const numValue = Number(value);
                if (rule.min !== undefined && numValue < rule.min) {
                    errors.push(`${fieldName} must be at least ${rule.min}`);
                }
                if (rule.max !== undefined && numValue > rule.max) {
                    errors.push(`${fieldName} must be no more than ${rule.max}`);
                }
            }
            break;

        case 'integer':
            if (!Number.isInteger(Number(value))) {
                errors.push(`${fieldName} must be an integer`);
            } else {
                const intValue = Number(value);
                if (rule.min !== undefined && intValue < rule.min) {
                    errors.push(`${fieldName} must be at least ${rule.min}`);
                }
                if (rule.max !== undefined && intValue > rule.max) {
                    errors.push(`${fieldName} must be no more than ${rule.max}`);
                }
            }
            break;

        case 'boolean':
            if (typeof value !== 'boolean') {
                errors.push(`${fieldName} must be a boolean value`);
            }
            break;

        case 'date':
            try {
                parseDate(value);
            } catch (error) {
                errors.push(`${fieldName}: ${error.message}`);
            }
            break;

        case 'guid':
            if (!isValidGuid(value)) {
                errors.push(`${fieldName} must be a valid GUID format`);
            }
            break;

        case 'url':
            if (!isValidUrl(value)) {
                errors.push(`${fieldName} must be a valid URL format`);
            }
            break;

        case 'email':
            if (!isValidEmail(value)) {
                errors.push(`${fieldName} must be a valid email format`);
            }
            break;
    }

    return errors;
}

function processField(fieldName, value, rule, config) {
    if (value === null || value === undefined) return value;

    // Apply transformations based on type
    switch (rule.type) {
        case 'string':
            return config.trimStrings ? String(value).trim() : String(value);

        case 'number':
            return Number(value);

        case 'integer':
            return parseInt(value, 10);

        case 'boolean':
            if (typeof value === 'string') {
                return value.toLowerCase() === 'true';
            }
            return Boolean(value);

        case 'date':
            return parseDate(value);

        default:
            return config.trimStrings && typeof value === 'string' ? value.trim() : value;
    }
}

// Process items
for (let i = 0; i < inputItems.length; i++) {
    const item = inputItems[i];
    const input = item.json;

    // Extract configuration from the incoming data
    const config = getConfig(input);

    // Get the actual data to validate
    const dataToValidate = input.data || {};

    // Parse configuration
    const requiredFieldsList = config.requiredFields ?
        config.requiredFields.split(',').map(field => field.trim()).filter(field => field) :
        [];

    const fieldRules = config.fieldRules || {};

    console.log(`Validator configured with ${requiredFieldsList.length} required fields:`, requiredFieldsList);
    console.log('Field rules loaded:', Object.keys(fieldRules));

    try {
        const errors = [];
        const warnings = [];
        const processedData = {};

        console.log(`Processing item ${i + 1}/${inputItems.length}`);

        // Check required fields
        requiredFieldsList.forEach(fieldName => {
            const value = dataToValidate[fieldName];
            if (value === undefined || value === null || value === '') {
                errors.push(`Missing required field: ${fieldName}`);
            }
        });

        // Validate and process all fields
        Object.keys(dataToValidate).forEach(fieldName => {
            const value = dataToValidate[fieldName];
            const rule = fieldRules[fieldName] || {};

            // Skip internal fields
            if (fieldName.startsWith('_')) {
                processedData[fieldName] = value;
                return;
            }

            try {
                // Validate the field
                const fieldErrors = validateField(fieldName, value, rule);
                errors.push(...fieldErrors);

                // Process/transform the field if no errors
                if (fieldErrors.length === 0) {
                    processedData[fieldName] = processField(fieldName, value, rule, config);
                } else {
                    // Keep original value if validation failed
                    processedData[fieldName] = value;
                }

            } catch (fieldError) {
                errors.push(`Field processing error for ${fieldName}: ${fieldError.message}`);
                processedData[fieldName] = value;
            }
        });

        // Check for unknown fields if strict mode
        if (fieldRules._strict === true) {
            Object.keys(dataToValidate).forEach(fieldName => {
                if (!fieldRules[fieldName] && !fieldName.startsWith('_')) {
                    warnings.push(`Unknown field: ${fieldName}`);
                }
            });
        }

        // Remove null/undefined values if configured
        if (fieldRules._removeNulls === true) {
            Object.keys(processedData).forEach(key => {
                if (processedData[key] === null || processedData[key] === undefined) {
                    delete processedData[key];
                }
            });
        }

        // Build response
        const response = {
            valid: errors.length === 0,
            data: processedData,
            validation: {
                requiredFieldsChecked: requiredFieldsList.length,
                rulesApplied: Object.keys(fieldRules).filter(key => !key.startsWith('_')).length,
                processingTimestamp: new Date().toISOString()
            }
        };

        // Add errors if any
        if (errors.length > 0) {
            response.errors = errors;
            response.receivedData = dataToValidate;
        }

        // Add warnings if any
        if (warnings.length > 0) {
            response.warnings = warnings;
        }

        outputItems.push({
            json: response,
            pairedItem: i
        });

    } catch (error) {
        // Handle unexpected errors
        console.error(`Validation error for item ${i}:`, error);

        outputItems.push({
            json: {
                valid: false,
                errors: [`Validation error: ${error.message}`],
                receivedData: dataToValidate,
                validation: {
                    error: true,
                    errorMessage: error.message,
                    processingTimestamp: new Date().toISOString()
                }
            },
            pairedItem: i
        });
    }
}

console.log(`Validation complete. Processed ${outputItems.length} items.`);
console.log(`Valid items: ${outputItems.filter(item => item.json.valid).length}`);
console.log(`Invalid items: ${outputItems.filter(item => !item.json.valid).length}`);

return outputItems;