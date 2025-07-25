# n8n Built-in Functions Overview

## Introduction

n8n provides a comprehensive set of built-in functions and variables that are available within expressions and Code nodes. These functions enable powerful data transformation, node interaction, and workflow automation capabilities when self-hosting n8n.

## Function Categories

### Data Transformation Functions
- **Arrays**: Manipulate and transform array data
- **Strings**: Process and format text data
- **Objects**: Work with JSON objects and properties
- **Numbers**: Perform mathematical operations and formatting
- **Booleans**: Handle boolean logic and conversions
- **Dates**: Parse, format, and calculate with dates

### Node Access Functions
- **Current Node Input**: Access data from the current node's input
- **Output from Other Nodes**: Retrieve data from previous nodes in the workflow

### Utility Functions
- **Convenience Functions**: Common utility operations
- **JMESPath**: Advanced JSON query capabilities
- **HTTP Variables**: Access HTTP request/response data
- **n8n Metadata**: Workflow and execution information
- **Date/Time Utilities**: Specialized date/time operations

### Code Node Specifics
- **Expressions**: Expression syntax and usage
- **Code Node**: JavaScript execution environment details

## Documentation Structure

This documentation is organized into the following files:

1. **[n8n-builtin-data-transformation.md](./n8n-builtin-data-transformation.md)** - All data transformation functions
2. **[n8n-builtin-node-access.md](./n8n-builtin-node-access.md)** - Functions for accessing node input/output
3. **[n8n-builtin-utilities.md](./n8n-builtin-utilities.md)** - Utility and convenience functions
4. **[n8n-builtin-code-nodes.md](./n8n-builtin-code-nodes.md)** - Code node and expression specifics

## Usage Context

These functions are available in:
- **Expressions**: `{{ $function() }}` syntax
- **Code Nodes**: Direct JavaScript access
- **Function Nodes**: When using the Function item
- **Set Node**: When transforming data

## Self-Hosting Considerations

When self-hosting n8n, all these built-in functions are available by default. No additional packages or configurations are required for the core functionality documented here.

## Quick Reference

For quick function lookup:
- Use Ctrl+F (Cmd+F on Mac) to search within documentation files
- Function names follow camelCase convention
- Most functions include examples and use cases
- Error handling patterns are documented where applicable 