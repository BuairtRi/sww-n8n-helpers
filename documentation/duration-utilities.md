# Duration Utilities Module

Parse and format time durations in various formats, perfect for handling time-based data in n8n workflows.

## Import Options

**Individual Function Import (Recommended for single functions):**
```javascript
const { parseDurationToSeconds, formatFriendlyDuration } = require('@rin8n/content-processing-utils');
```

**Module Import (Recommended for multiple functions):**
```javascript
const { duration } = require('@rin8n/content-processing-utils');
// Use: duration.parseDurationToSeconds(), duration.formatFriendlyDuration(), etc.
```

**Mixed Import:**
```javascript
const { parseDurationToSeconds, duration } = require('@rin8n/content-processing-utils');
// Use both: parseDurationToSeconds() and duration.getDurationStats()
```

## Key Functions

### `parseDurationToSeconds(duration, options)`

Parse various duration formats into seconds.

**Supported Formats:**
- Human readable: "2 hours 30 minutes", "1h 30m", "90 minutes"
- Time format: "2:30:15" (HH:MM:SS), "1:30" (MM:SS)
- Numbers: 3600 (assumed seconds)
- Various units: "2h", "30min", "45s"

**Parameters:**
- `duration` (String|Number): Duration in various formats
- `options` (Object): Parsing options
  - `strict` (Boolean): Return null for invalid formats (default: false)

**Example: Parse Various Duration Formats**
```javascript
// Individual function import
const { parseDurationToSeconds } = require('@rin8n/content-processing-utils');

const duration1 = parseDurationToSeconds("2:30:15");
// Returns: 9015 (2 hours, 30 minutes, 15 seconds)

const duration2 = parseDurationToSeconds("1h 30m");
// Returns: 5400 (1.5 hours)

const duration3 = parseDurationToSeconds("90 minutes");
// Returns: 5400 (90 minutes)

const duration4 = parseDurationToSeconds(3600);
// Returns: 3600 (assumes seconds)

const invalid = parseDurationToSeconds("invalid", { strict: true });
// Returns: null (strict mode rejects invalid formats)
```

**Example: Using Module Import**
```javascript
// Module import
const { duration } = require('@rin8n/content-processing-utils');

const seconds = duration.parseDurationToSeconds("2:30:15");
// Returns: 9015

const strict = duration.parseDurationToSeconds("invalid", { strict: true });
// Returns: null
```

**Example: Strict Validation**
```javascript
const { parseDurationToSeconds } = require('@rin8n/content-processing-utils');

const validDuration = parseDurationToSeconds("2:30", { strict: true });
// Returns: 150 (valid format)

const invalidDuration = parseDurationToSeconds("invalid", { strict: true });
// Returns: null (strict mode rejects invalid)

const lenientParsing = parseDurationToSeconds("invalid", { strict: false });
// Returns: 0 (lenient mode provides fallback)
```

### `formatFriendlyDuration(seconds, options)`

Convert seconds to human-readable duration strings.

**Parameters:**
- `seconds` (Number): Duration in seconds
- `options` (Object): Formatting options
  - `includeSeconds` (Boolean): Include seconds in output (default: false)
  - `format` (String): 'long' or 'short' format (default: 'long')

**Example: Format Friendly Durations**
```javascript
const { formatFriendlyDuration } = require('@rin8n/content-processing-utils');

const friendly = formatFriendlyDuration(9015);
// Returns: "2 hours and 30 minutes" (default long format)

const short = formatFriendlyDuration(9015, { format: 'short' });
// Returns: "2h 30m" (short format)

const withSeconds = formatFriendlyDuration(9015, { includeSeconds: true });
// Returns: "2 hours and 30 minutes and 15 seconds"

const minutesOnly = formatFriendlyDuration(1800);
// Returns: "30 minutes" (no hours when zero)
```

### `convertSecondsToHHMMSS(seconds, options)`

Convert seconds to HH:MM:SS time format.

**Parameters:**
- `seconds` (Number): Duration in seconds
- `options` (Object): Formatting options
  - `alwaysShowHours` (Boolean): Always show hours even if 0 (default: false)

**Example: Time Code Generation**
```javascript
const { convertSecondsToHHMMSS } = require('@rin8n/content-processing-utils');

const duration1 = convertSecondsToHHMMSS(9015);
// Returns: "02:30:15" (2 hours 30 minutes 15 seconds)

const duration2 = convertSecondsToHHMMSS(1815);
// Returns: "30:15" (30 minutes 15 seconds, no hours shown)

const withHours = convertSecondsToHHMMSS(1815, { alwaysShowHours: true });
// Returns: "00:30:15" (always includes hours)

const chapters = [{ start: 0 }, { start: 1800 }].map(ch => convertSecondsToHHMMSS(ch.start));
// Returns: ["00:00", "30:00"] (chapter timestamps)
```

### `isValidDurationFormat(duration)`

Validate if a duration string is in a supported format.

**Example: Format Validation**
```javascript
const { isValidDurationFormat } = require('@rin8n/content-processing-utils');

const formats = ["2:30", "1h 30m", "90 minutes", "invalid", "3600"];

const validationResults = formats.map(format => ({
  format,
  isValid: isValidDurationFormat(format)
}));

// Returns: [
//   { format: "2:30", isValid: true },
//   { format: "1h 30m", isValid: true }, 
//   { format: "90 minutes", isValid: true },
//   { format: "invalid", isValid: false },
//   { format: "3600", isValid: true }
// ]
```

### `getDurationStats(durations)`

Calculate statistics from an array of duration values.

**Example: Duration Statistics**
```javascript
const { getDurationStats } = require('@rin8n/content-processing-utils');

const durations = ["1:30", "2:45:30", "45min", "invalid", "3600"];
const stats = getDurationStats(durations);

// Returns: {
//   total: 16470,              // Total valid seconds
//   average: 4117,             // Average seconds  
//   min: 90,                   // Minimum (1:30)
//   max: 9930,                 // Maximum (2:45:30)
//   count: 4,                  // Valid duration count
//   totalFormatted: "4 hours and 34 minutes",
//   averageFormatted: "1 hour and 8 minutes"
// }
```

## Usage Patterns

### Duration Categorization
```javascript
const { duration } = require('@rin8n/content-processing-utils');

const seconds = duration.parseDurationToSeconds("1:30:45"); // 5445 seconds
const category = seconds < 900 ? 'short' : seconds < 3600 ? 'medium' : 'long';
// Returns: 'long' (over 1 hour)
```

### Content Filtering
```javascript
const { parseDurationToSeconds } = require('@rin8n/content-processing-utils');

const durations = ["0:30", "1:45", "2:30:00"];
const longContent = durations.filter(d => parseDurationToSeconds(d) > 3600);
// Returns: ["2:30:00"] (content over 1 hour)
```

### Database Preparation
```javascript
const { duration } = require('@rin8n/content-processing-utils');

const durationStr = "1:30:45";
const seconds = duration.parseDurationToSeconds(durationStr); // 5445

const dbRecord = {
  duration_seconds: seconds,
  duration_formatted: duration.convertSecondsToHHMMSS(seconds), // "01:30:45"
  duration_category: seconds < 1800 ? 'short' : seconds < 3600 ? 'medium' : 'long', // "long"
  has_valid_duration: seconds !== null
};
```

### YouTube API Integration
```javascript
const { parseDurationToSeconds, formatFriendlyDuration } = require('@rin8n/content-processing-utils');

// Convert YouTube ISO 8601 duration (PT1H30M15S) to human format
function parseYouTubeDuration(iso8601) {
  const match = iso8601.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return null;
  
  const h = parseInt(match[1] || 0);
  const m = parseInt(match[2] || 0);
  const s = parseInt(match[3] || 0);
  return `${h}h ${m}m ${s}s`;
}

const youtubeDuration = "PT1H30M15S";
const normalized = parseYouTubeDuration(youtubeDuration); // "1h 30m 15s"
const seconds = parseDurationToSeconds(normalized);        // 5415
const friendly = formatFriendlyDuration(seconds);          // "1 hour and 30 minutes"
```

## Best Practices

1. **Always validate parsed durations** before using them in calculations
2. **Use strict mode** when data quality is critical
3. **Store both seconds and formatted versions** for flexibility
4. **Handle null/invalid durations gracefully** in your workflows
5. **Use appropriate format options** based on your audience (short vs long format)
6. **Consider time zones** when working with absolute times vs durations
7. **Choose import style** based on usage: individual functions for occasional use, module import for extensive usage

## Error Handling

Duration parsing fails gracefully:
```javascript
const { parseDurationToSeconds } = require('@rin8n/content-processing-utils');

const result = parseDurationToSeconds("invalid duration");
// Returns: 0 (non-strict mode)

const resultStrict = parseDurationToSeconds("invalid duration", { strict: true });
// Returns: null (strict mode)

const result2 = parseDurationToSeconds("2:30");
// Returns: 150 (2 minutes 30 seconds)
```

Always check for null returns when using parsed durations in calculations or storage operations. 