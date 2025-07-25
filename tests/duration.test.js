// tests/duration.test.js
const {
  parseDurationToSeconds,
  formatFriendlyDuration,
  convertSecondsToHHMMSS,
  isValidDurationFormat,
  getDurationStats,
  duration
} = require('../index');

describe('Duration Utilities', () => {
  // Test individual function imports (existing behavior)
  describe('Individual Function Imports', () => {
    describe('parseDurationToSeconds', () => {
      test('should parse numeric seconds', () => {
        expect(parseDurationToSeconds(3600)).toBe(3600);
        expect(parseDurationToSeconds('3600')).toBe(3600);
        expect(parseDurationToSeconds(0)).toBe(0);
      });

      test('should parse HH:MM:SS format', () => {
        expect(parseDurationToSeconds('1:30:45')).toBe(5445);
        expect(parseDurationToSeconds('0:05:30')).toBe(330);
        expect(parseDurationToSeconds('2:00:00')).toBe(7200);
      });

      test('should parse MM:SS format', () => {
        expect(parseDurationToSeconds('30:45')).toBe(1845);
        expect(parseDurationToSeconds('5:30')).toBe(330);
        expect(parseDurationToSeconds('0:30')).toBe(30);
      });

      test('should parse human-readable formats', () => {
        expect(parseDurationToSeconds('1h 30m')).toBe(5400);
        expect(parseDurationToSeconds('90 minutes')).toBe(5400);
        expect(parseDurationToSeconds('2 hours')).toBe(7200);
      });

      test('should handle invalid inputs', () => {
        expect(parseDurationToSeconds(null)).toBeNull();
        expect(parseDurationToSeconds('')).toBeNull();
        expect(parseDurationToSeconds('invalid')).toBe(0);
        expect(parseDurationToSeconds('invalid', { strict: true })).toBeNull();
      });

      test('should handle edge cases', () => {
        expect(parseDurationToSeconds(-1)).toBe(0);
        expect(parseDurationToSeconds('1:2:3:4')).toBe(0);
        expect(parseDurationToSeconds('1:abc:30')).toBe(0);
      });
    });

    describe('formatFriendlyDuration', () => {
      test('should format hours and minutes (long format)', () => {
        expect(formatFriendlyDuration(5445)).toBe('1 hour and 30 minutes');
        expect(formatFriendlyDuration(3600)).toBe('1 hour');
        expect(formatFriendlyDuration(7200)).toBe('2 hours');
        expect(formatFriendlyDuration(1800)).toBe('30 minutes');
        expect(formatFriendlyDuration(60)).toBe('1 minute');
      });

      test('should format in short format', () => {
        expect(formatFriendlyDuration(5445, { format: 'short' })).toBe('1h 30m');
        expect(formatFriendlyDuration(3600, { format: 'short' })).toBe('1h');
        expect(formatFriendlyDuration(1800, { format: 'short' })).toBe('30m');
      });

      test('should include seconds when requested', () => {
        expect(formatFriendlyDuration(5445, { includeSeconds: true }))
          .toBe('1 hour and 30 minutes and 45 seconds');
        expect(formatFriendlyDuration(5445, { format: 'short', includeSeconds: true }))
          .toBe('1h 30m 45s');
      });

      test('should handle invalid inputs', () => {
        expect(formatFriendlyDuration(0)).toBeNull();
        expect(formatFriendlyDuration(-1)).toBeNull();
        expect(formatFriendlyDuration(null)).toBeNull();
      });
    });

    describe('convertSecondsToHHMMSS', () => {
      test('should convert to HH:MM:SS format', () => {
        expect(convertSecondsToHHMMSS(5445)).toBe('01:30:45');
        expect(convertSecondsToHHMMSS(3600)).toBe('01:00:00');
        expect(convertSecondsToHHMMSS(330)).toBe('05:30');
      });

      test('should handle alwaysShowHours option', () => {
        expect(convertSecondsToHHMMSS(330, { alwaysShowHours: true })).toBe('00:05:30');
        expect(convertSecondsToHHMMSS(330, { alwaysShowHours: false })).toBe('05:30');
      });

      test('should handle invalid inputs', () => {
        expect(convertSecondsToHHMMSS(0)).toBeNull();
        expect(convertSecondsToHHMMSS(-1)).toBeNull();
        expect(convertSecondsToHHMMSS(null)).toBeNull();
      });
    });

    describe('isValidDurationFormat', () => {
      test('should validate various duration formats', () => {
        expect(isValidDurationFormat('1:30:45')).toBe(true);
        expect(isValidDurationFormat('90 minutes')).toBe(true);
        expect(isValidDurationFormat('3600')).toBe(true);
        expect(isValidDurationFormat('1h 30m')).toBe(true);
      });

      test('should reject invalid formats', () => {
        expect(isValidDurationFormat('')).toBe(false);
        expect(isValidDurationFormat('invalid')).toBe(false);
        expect(isValidDurationFormat('1:2:3:4')).toBe(false);
        expect(isValidDurationFormat(null)).toBe(false);
      });
    });

    describe('getDurationStats', () => {
      test('should calculate statistics for valid durations', () => {
        const durations = ['1:00:00', '2:00:00', '30:00', '90 minutes'];
        const stats = getDurationStats(durations);
        
        expect(stats.count).toBe(4);
        expect(stats.total).toBe(18000); // 3600 + 7200 + 1800 + 5400 = 18000
        expect(stats.average).toBe(4500); // 18000 / 4 = 4500
        expect(stats.min).toBe(1800);
        expect(stats.max).toBe(7200);
        expect(stats.totalFormatted).toContain('5 hours');
        expect(stats.averageFormatted).toContain('1 hour');
      });

      test('should handle empty or invalid durations', () => {
        const stats = getDurationStats([]);
        expect(stats.count).toBe(0);
        expect(stats.total).toBe(0);
        
        const statsInvalid = getDurationStats(['invalid', '', null]);
        expect(statsInvalid.count).toBe(0);
      });

      test('should filter out invalid durations', () => {
        const durations = ['1:00:00', 'invalid', '2:00:00', '', null];
        const stats = getDurationStats(durations);
        
        expect(stats.count).toBe(2);
        expect(stats.total).toBe(10800); // 3600 + 7200
      });
    });
  });

  // Test module-grouped imports (new hybrid functionality)
  describe('Module Import', () => {
    test('should have duration module available', () => {
      expect(duration).toBeDefined();
      expect(typeof duration).toBe('object');
    });

    test('should have all expected functions in duration module', () => {
      expect(typeof duration.parseDurationToSeconds).toBe('function');
      expect(typeof duration.formatFriendlyDuration).toBe('function');
      expect(typeof duration.convertSecondsToHHMMSS).toBe('function');
      expect(typeof duration.isValidDurationFormat).toBe('function');
      expect(typeof duration.getDurationStats).toBe('function');
    });

    test('should work identically to individual imports', () => {
      // Test parseDurationToSeconds
      expect(duration.parseDurationToSeconds('1:30:45')).toBe(5445);
      expect(parseDurationToSeconds('1:30:45')).toBe(5445);
      
      // Test formatFriendlyDuration
      expect(duration.formatFriendlyDuration(5445)).toBe('1 hour and 30 minutes');
      expect(formatFriendlyDuration(5445)).toBe('1 hour and 30 minutes');
      
      // Test convertSecondsToHHMMSS
      expect(duration.convertSecondsToHHMMSS(5445)).toBe('01:30:45');
      expect(convertSecondsToHHMMSS(5445)).toBe('01:30:45');
      
      // Test isValidDurationFormat
      expect(duration.isValidDurationFormat('1:30:45')).toBe(true);
      expect(isValidDurationFormat('1:30:45')).toBe(true);
      
      // Test getDurationStats
      const durations = ['1:00:00', '2:00:00'];
      const moduleStats = duration.getDurationStats(durations);
      const individualStats = getDurationStats(durations);
      expect(moduleStats).toEqual(individualStats);
    });

    test('should handle strict mode consistently', () => {
      const invalidInput = 'invalid';
      const strictOptions = { strict: true };
      
      expect(duration.parseDurationToSeconds(invalidInput, strictOptions)).toBeNull();
      expect(parseDurationToSeconds(invalidInput, strictOptions)).toBeNull();
    });

    test('should handle formatting options consistently', () => {
      const seconds = 5445;
      const shortOptions = { format: 'short' };
      const withSecondsOptions = { includeSeconds: true };
      
      expect(duration.formatFriendlyDuration(seconds, shortOptions)).toBe('1h 30m');
      expect(formatFriendlyDuration(seconds, shortOptions)).toBe('1h 30m');
      
      expect(duration.formatFriendlyDuration(seconds, withSecondsOptions))
        .toBe('1 hour and 30 minutes and 45 seconds');
      expect(formatFriendlyDuration(seconds, withSecondsOptions))
        .toBe('1 hour and 30 minutes and 45 seconds');
    });
  });
});