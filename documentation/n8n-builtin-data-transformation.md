# n8n Built-in Data Transformation Functions

## Overview

n8n provides extensive data transformation functions for manipulating arrays, strings, objects, numbers, booleans, and dates. These functions are available in expressions and Code nodes.

## Array Functions

### Basic Array Operations
- `$first(array)` - Get the first element
- `$last(array)` - Get the last element
- `$length(array)` - Get array length
- `$isEmpty(array)` - Check if array is empty

### Array Manipulation
- `$push(array, item)` - Add item to end of array
- `$pop(array)` - Remove and return last element
- `$shift(array)` - Remove and return first element
- `$unshift(array, item)` - Add item to beginning of array
- `$slice(array, start, end)` - Extract portion of array
- `$concat(array1, array2)` - Combine arrays
- `$reverse(array)` - Reverse array order

### Array Filtering and Searching
- `$filter(array, condition)` - Filter elements by condition
- `$find(array, condition)` - Find first matching element
- `$includes(array, value)` - Check if array contains value
- `$indexOf(array, value)` - Get index of value
- `$unique(array)` - Remove duplicate values

### Array Transformation
- `$map(array, expression)` - Transform each element
- `$reduce(array, reducer, initial)` - Reduce array to single value
- `$sort(array, key)` - Sort array by key
- `$groupBy(array, key)` - Group array elements by key
- `$flatten(array)` - Flatten nested arrays

## String Functions

### Basic String Operations
- `$length(string)` - Get string length
- `$isEmpty(string)` - Check if string is empty
- `$trim(string)` - Remove whitespace from ends
- `$upper(string)` - Convert to uppercase
- `$lower(string)` - Convert to lowercase
- `$capitalize(string)` - Capitalize first letter

### String Manipulation
- `$substring(string, start, length)` - Extract substring
- `$slice(string, start, end)` - Extract slice
- `$split(string, delimiter)` - Split into array
- `$replace(string, search, replace)` - Replace text
- `$replaceAll(string, search, replace)` - Replace all occurrences
- `$concat(string1, string2)` - Concatenate strings

### String Searching
- `$includes(string, search)` - Check if contains substring
- `$startsWith(string, prefix)` - Check if starts with prefix
- `$endsWith(string, suffix)` - Check if ends with suffix
- `$indexOf(string, search)` - Find index of substring
- `$lastIndexOf(string, search)` - Find last index of substring

### String Formatting
- `$padStart(string, length, char)` - Pad start with character
- `$padEnd(string, length, char)` - Pad end with character
- `$repeat(string, count)` - Repeat string
- `$stripTags(string)` - Remove HTML tags
- `$escapeHtml(string)` - Escape HTML characters
- `$unescapeHtml(string)` - Unescape HTML characters

### Regular Expressions
- `$regex(string, pattern, flags)` - Test regex pattern
- `$regexExtract(string, pattern, group)` - Extract regex groups
- `$regexReplace(string, pattern, replacement)` - Replace using regex

## Object Functions

### Object Properties
- `$keys(object)` - Get object keys
- `$values(object)` - Get object values
- `$entries(object)` - Get key-value pairs
- `$hasProperty(object, key)` - Check if property exists
- `$get(object, path)` - Get nested property value
- `$set(object, path, value)` - Set nested property value

### Object Manipulation
- `$merge(object1, object2)` - Merge objects
- `$assign(target, source)` - Assign properties
- `$pick(object, keys)` - Pick specific properties
- `$omit(object, keys)` - Omit specific properties
- `$clone(object)` - Deep clone object
- `$deepMerge(object1, object2)` - Deep merge objects

### Object Transformation
- `$mapKeys(object, mapper)` - Transform object keys
- `$mapValues(object, mapper)` - Transform object values
- `$invert(object)` - Swap keys and values
- `$flatten(object, separator)` - Flatten nested object
- `$unflatten(object, separator)` - Unflatten object

## Number Functions

### Basic Math Operations
- `$abs(number)` - Absolute value
- `$ceil(number)` - Round up
- `$floor(number)` - Round down
- `$round(number, precision)` - Round to precision
- `$min(numbers...)` - Minimum value
- `$max(numbers...)` - Maximum value

### Number Formatting
- `$numberFormat(number, format)` - Format number
- `$toFixed(number, digits)` - Fixed decimal places
- `$toPrecision(number, precision)` - Specified precision
- `$toExponential(number, digits)` - Exponential notation
- `$parseInt(string, radix)` - Parse integer
- `$parseFloat(string)` - Parse float

### Mathematical Functions
- `$pow(base, exponent)` - Power function
- `$sqrt(number)` - Square root
- `$random()` - Random number 0-1
- `$randomInt(min, max)` - Random integer
- `$sum(array)` - Sum array values
- `$average(array)` - Average of array

### Number Validation
- `$isNumber(value)` - Check if number
- `$isInteger(value)` - Check if integer
- `$isFloat(value)` - Check if float
- `$isFinite(value)` - Check if finite
- `$isNaN(value)` - Check if NaN

## Boolean Functions

### Boolean Operations
- `$and(bool1, bool2)` - Logical AND
- `$or(bool1, bool2)` - Logical OR
- `$not(boolean)` - Logical NOT
- `$xor(bool1, bool2)` - Exclusive OR

### Boolean Conversion
- `$toBoolean(value)` - Convert to boolean
- `$isBoolean(value)` - Check if boolean
- `$isTruthy(value)` - Check if truthy
- `$isFalsy(value)` - Check if falsy

### Comparison Functions
- `$equals(value1, value2)` - Deep equality
- `$isEqual(value1, value2)` - Strict equality
- `$isEmpty(value)` - Check if empty
- `$isNull(value)` - Check if null
- `$isUndefined(value)` - Check if undefined

## Date Functions

### Date Creation
- `$now()` - Current timestamp
- `$today()` - Today's date
- `$date(dateString)` - Parse date string
- `$dateFromTimestamp(timestamp)` - Create from timestamp
- `$dateFromComponents(year, month, day)` - Create from components

### Date Formatting
- `$dateFormat(date, format)` - Format date
- `$dateToIso(date)` - ISO string format
- `$dateToTimestamp(date)` - Convert to timestamp
- `$dateToString(date)` - Convert to string

### Date Manipulation
- `$dateAdd(date, amount, unit)` - Add time
- `$dateSubtract(date, amount, unit)` - Subtract time
- `$dateStartOf(date, unit)` - Start of period
- `$dateEndOf(date, unit)` - End of period
- `$dateTruncate(date, unit)` - Truncate to unit

### Date Comparison
- `$dateBetween(date, start, end)` - Check if between dates
- `$dateDiff(date1, date2, unit)` - Difference between dates
- `$dateIsSame(date1, date2, unit)` - Check if same period
- `$dateIsBefore(date1, date2)` - Check if before
- `$dateIsAfter(date1, date2)` - Check if after

### Date Components
- `$dateExtract(date, component)` - Extract component
- `$year(date)` - Get year
- `$month(date)` - Get month
- `$day(date)` - Get day
- `$hour(date)` - Get hour
- `$minute(date)` - Get minute
- `$second(date)` - Get second
- `$dayOfWeek(date)` - Get day of week
- `$weekOfYear(date)` - Get week number

## Usage Examples

### Array Example
```javascript
// Filter and transform array
{{ $map($filter($input.items, "price > 100"), "name") }}

// Group items by category
{{ $groupBy($input.products, "category") }}
```

### String Example
```javascript
// Clean and format text
{{ $trim($upper($input.text)) }}

// Extract using regex
{{ $regexExtract($input.email, "([^@]+)@(.+)", 1) }}
```

### Object Example
```javascript
// Get nested property safely
{{ $get($input.data, "user.profile.name") }}

// Merge user data
{{ $merge($input.defaults, $input.userPreferences) }}
```

### Number Example
```javascript
// Calculate percentage
{{ $round(($input.completed / $input.total) * 100, 2) }}

// Format currency
{{ $numberFormat($input.amount, "$#,##0.00") }}
```

### Date Example
```javascript
// Add 30 days to current date
{{ $dateAdd($now(), 30, "days") }}

// Format for display
{{ $dateFormat($input.createdAt, "YYYY-MM-DD HH:mm") }}
```

## Error Handling

- Functions return `null` for invalid inputs
- Use `$isEmpty()` to check for null/undefined values
- Wrap operations in try-catch for robust error handling
- Check data types before applying transformation functions 