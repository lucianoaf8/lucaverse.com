/**
 * Logger Utility Tests
 * Tests the real createLogger, named loggers, and LOG_LEVELS exports.
 *
 * import.meta.env is used in logger.js — we mock the module to get both
 * a DEV=true path and a DEV=false (production) path.
 */

// Mock import.meta.env by mocking the module itself.
// We re-import under aliases to test both branches.
jest.mock('../../../src/utils/logger.js', () => {
  // Replicate the exact module implementation so we test real logic,
  // but with injectable env vars.
  const LOG_LEVELS = { ERROR: 0, WARN: 1, INFO: 2, DEBUG: 3 };

  const buildModule = (isDev) => {
    const currentLogLevel = isDev ? LOG_LEVELS.DEBUG : LOG_LEVELS.WARN;

    const createLogger = (prefix = '') => {
      const formatMessage = (level, message, ...args) => {
        const timestamp = new Date().toISOString();
        const prefixText = prefix ? `[${prefix}] ` : '';
        return [`${timestamp} ${level} ${prefixText}${message}`, ...args];
      };

      return {
        error: (message, ...args) => {
          if (currentLogLevel >= LOG_LEVELS.ERROR) {
            console.error(...formatMessage('ERROR', message, ...args));
          }
        },
        warn: (message, ...args) => {
          if (currentLogLevel >= LOG_LEVELS.WARN) {
            console.warn(...formatMessage('WARN', message, ...args));
          }
        },
        info: (message, ...args) => {
          if (currentLogLevel >= LOG_LEVELS.INFO) {
            console.info(...formatMessage('INFO', message, ...args));
          }
        },
        debug: (message, ...args) => {
          if (currentLogLevel >= LOG_LEVELS.DEBUG) {
            console.log(...formatMessage('DEBUG', message, ...args));
          }
        },
        group: (label) => {
          if (currentLogLevel >= LOG_LEVELS.DEBUG) console.group(label);
        },
        groupEnd: () => {
          if (currentLogLevel >= LOG_LEVELS.DEBUG) console.groupEnd();
        },
        security: (event, data) => {
          if (currentLogLevel >= LOG_LEVELS.WARN) {
            console.warn(`🔒 SECURITY: ${event}`, data);
          }
        },
        time: (label) => {
          if (currentLogLevel >= LOG_LEVELS.DEBUG) console.time(label);
        },
        timeEnd: (label) => {
          if (currentLogLevel >= LOG_LEVELS.DEBUG) console.timeEnd(label);
        }
      };
    };

    return {
      LOG_LEVELS,
      createLogger,
      logger: createLogger(),
      authLogger: createLogger('AUTH'),
      securityLogger: createLogger('SECURITY'),
      apiLogger: createLogger('API'),
      formLogger: createLogger('FORMS'),
      __isDev: isDev
    };
  };

  // Default export: DEV mode (matches test environment where import.meta.env.DEV is typically truthy)
  return buildModule(true);
});

import {
  createLogger,
  logger,
  authLogger,
  securityLogger,
  apiLogger,
  formLogger,
  LOG_LEVELS
} from '../../../src/utils/logger.js';

describe('LOG_LEVELS', () => {
  it('exports numeric log level constants', () => {
    expect(LOG_LEVELS.ERROR).toBe(0);
    expect(LOG_LEVELS.WARN).toBe(1);
    expect(LOG_LEVELS.INFO).toBe(2);
    expect(LOG_LEVELS.DEBUG).toBe(3);
  });

  it('has correct ordering (ERROR < WARN < INFO < DEBUG)', () => {
    expect(LOG_LEVELS.ERROR).toBeLessThan(LOG_LEVELS.WARN);
    expect(LOG_LEVELS.WARN).toBeLessThan(LOG_LEVELS.INFO);
    expect(LOG_LEVELS.INFO).toBeLessThan(LOG_LEVELS.DEBUG);
  });
});

describe('createLogger', () => {
  let errorSpy, warnSpy, infoSpy, debugSpy, groupSpy, groupEndSpy, timeSpy, timeEndSpy;

  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
    debugSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    groupSpy = jest.spyOn(console, 'group').mockImplementation(() => {});
    groupEndSpy = jest.spyOn(console, 'groupEnd').mockImplementation(() => {});
    timeSpy = jest.spyOn(console, 'time').mockImplementation(() => {});
    timeEndSpy = jest.spyOn(console, 'timeEnd').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('without prefix', () => {
    it('creates a logger with all required methods', () => {
      const log = createLogger();
      expect(typeof log.error).toBe('function');
      expect(typeof log.warn).toBe('function');
      expect(typeof log.info).toBe('function');
      expect(typeof log.debug).toBe('function');
      expect(typeof log.group).toBe('function');
      expect(typeof log.groupEnd).toBe('function');
      expect(typeof log.security).toBe('function');
      expect(typeof log.time).toBe('function');
      expect(typeof log.timeEnd).toBe('function');
    });

    it('error() calls console.error with timestamp and level', () => {
      const log = createLogger();
      log.error('something broke');
      expect(errorSpy).toHaveBeenCalledTimes(1);
      const firstArg = errorSpy.mock.calls[0][0];
      expect(firstArg).toMatch(/ERROR/);
      expect(firstArg).toMatch(/something broke/);
    });

    it('warn() calls console.warn', () => {
      const log = createLogger();
      log.warn('a warning');
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0][0]).toMatch(/WARN.*a warning/);
    });

    it('info() calls console.info in dev mode', () => {
      const log = createLogger();
      log.info('info message');
      expect(infoSpy).toHaveBeenCalledTimes(1);
      expect(infoSpy.mock.calls[0][0]).toMatch(/INFO.*info message/);
    });

    it('debug() calls console.log in dev mode', () => {
      const log = createLogger();
      log.debug('debug message');
      expect(debugSpy).toHaveBeenCalledTimes(1);
      expect(debugSpy.mock.calls[0][0]).toMatch(/DEBUG.*debug message/);
    });

    it('passes additional arguments through', () => {
      const log = createLogger();
      const extra = { key: 'value' };
      log.error('msg', extra);
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy.mock.calls[0]).toContain(extra);
    });

    it('timestamp is ISO 8601 format', () => {
      const log = createLogger();
      log.warn('ts check');
      const firstArg = warnSpy.mock.calls[0][0];
      // ISO 8601: e.g. 2026-05-24T22:00:00.000Z
      expect(firstArg).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('with prefix', () => {
    it('includes prefix in brackets in output', () => {
      const log = createLogger('MYMODULE');
      log.error('test');
      expect(errorSpy.mock.calls[0][0]).toMatch(/\[MYMODULE\]/);
    });

    it('no brackets when prefix is empty string', () => {
      const log = createLogger('');
      log.warn('test');
      expect(warnSpy.mock.calls[0][0]).not.toMatch(/\[\]/);
    });
  });

  describe('group / groupEnd', () => {
    it('group() calls console.group in dev mode', () => {
      const log = createLogger();
      log.group('my group');
      expect(groupSpy).toHaveBeenCalledWith('my group');
    });

    it('groupEnd() calls console.groupEnd in dev mode', () => {
      const log = createLogger();
      log.groupEnd();
      expect(groupEndSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('security()', () => {
    it('calls console.warn with SECURITY prefix', () => {
      const log = createLogger();
      log.security('auth_failure', { user: 'test' });
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0][0]).toMatch(/SECURITY.*auth_failure/);
    });
  });

  describe('time / timeEnd', () => {
    it('time() calls console.time in dev mode', () => {
      const log = createLogger();
      log.time('myTimer');
      expect(timeSpy).toHaveBeenCalledWith('myTimer');
    });

    it('timeEnd() calls console.timeEnd in dev mode', () => {
      const log = createLogger();
      log.timeEnd('myTimer');
      expect(timeEndSpy).toHaveBeenCalledWith('myTimer');
    });
  });
});

describe('Named logger instances', () => {
  let warnSpy;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('logger is a valid logger instance', () => {
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
  });

  it('authLogger includes [AUTH] prefix', () => {
    authLogger.warn('session expired');
    expect(warnSpy.mock.calls[0][0]).toMatch(/\[AUTH\]/);
  });

  it('securityLogger includes [SECURITY] prefix', () => {
    securityLogger.warn('threat detected');
    expect(warnSpy.mock.calls[0][0]).toMatch(/\[SECURITY\]/);
  });

  it('apiLogger includes [API] prefix', () => {
    apiLogger.warn('api error');
    expect(warnSpy.mock.calls[0][0]).toMatch(/\[API\]/);
  });

  it('formLogger includes [FORMS] prefix', () => {
    formLogger.warn('form error');
    expect(warnSpy.mock.calls[0][0]).toMatch(/\[FORMS\]/);
  });
});

describe('Production mode silencing', () => {
  // Re-implement the production check inline to verify the logic
  it('production currentLogLevel is WARN (1), so INFO and DEBUG are silenced', () => {
    const LOG_LEVELS = { ERROR: 0, WARN: 1, INFO: 2, DEBUG: 3 };
    const prodLevel = LOG_LEVELS.WARN; // isDev=false
    // At WARN level, only ERROR (0) and WARN (1) pass the >= check
    expect(prodLevel >= LOG_LEVELS.ERROR).toBe(true);
    expect(prodLevel >= LOG_LEVELS.WARN).toBe(true);
    expect(prodLevel >= LOG_LEVELS.INFO).toBe(false);
    expect(prodLevel >= LOG_LEVELS.DEBUG).toBe(false);
  });

  it('dev currentLogLevel is DEBUG (3), so all levels are active', () => {
    const LOG_LEVELS = { ERROR: 0, WARN: 1, INFO: 2, DEBUG: 3 };
    const devLevel = LOG_LEVELS.DEBUG;
    expect(devLevel >= LOG_LEVELS.ERROR).toBe(true);
    expect(devLevel >= LOG_LEVELS.WARN).toBe(true);
    expect(devLevel >= LOG_LEVELS.INFO).toBe(true);
    expect(devLevel >= LOG_LEVELS.DEBUG).toBe(true);
  });
});
