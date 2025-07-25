// n8n Code Node: Enhanced SQL Text Sanitization (Using NPM Package)
// This node uses the @rin8n/content-processing-utils package for robust SQL sanitization
// Supports both single objects and batch processing with field-specific sanitization

// Import the enhanced utilities from your NPM package
const { 
  sanitizeItemsBatch, 
  DEFAULT_FIELD_MAPPINGS,
  processItemsWithPairing 
} = require('@rin8n/content-processing-utils');

const items = $input.all();

try {
  // Extract input data from n8n items
  const inputItems = items.map(item => item.json);
  
  // Configuration options (you can make these node parameters in n8n)
  const options = {
    // Use default field mappings, but allow override from first item if present
    fieldMappings: inputItems[0]?.fieldMappings || DEFAULT_FIELD_MAPPINGS,
    
    // Process only specified fields, or all if not specified
    fieldsToProcess: inputItems[0]?.fieldsToSanitize ? 
      inputItems[0].fieldsToSanitize.split(',').map(f => f.trim()) : null,
    
    // Include validation and metadata
    includeValidation: true,
    
    // Maintain n8n item pairing
    maintainPairing: true,
    
    // Log processing errors
    logErrors: true
  };
  
  // Process all items using the enhanced batch processor
  const sanitizedItems = sanitizeItemsBatch(inputItems, options);
  
  // Log summary
  const successCount = sanitizedItems.filter(item => !item.json._error).length;
  const errorCount = sanitizedItems.length - successCount;
  
  console.log(`SQL Sanitization completed: ${successCount} successful, ${errorCount} errors`);
  
  if (errorCount > 0) {
    console.warn(`${errorCount} items failed sanitization - check _error fields for details`);
  }
  
  return sanitizedItems;
  
} catch (error) {
  console.error('Fatal error in SQL sanitization:', error.message);
  
  // Return error items maintaining pairing
  return items.map((item, index) => ({
    json: {
      _error: {
        type: 'fatal_sanitization_error',
        message: error.message,
        timestamp: new Date().toISOString(),
        originalData: Object.keys(item.json || {})
      },
      processingMetadata: {
        sanitizedAt: new Date().toISOString(),
        itemIndex: index,
        failed: true
      }
    },
    pairedItem: index
  }));
} 