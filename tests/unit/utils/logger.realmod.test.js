/**
 * Logger real-module tests.
 * Imports the actual logger.js source (no mocking) to get source coverage.
 * import.meta.env is handled by the importMetaEnvPlugin in jest.config.js.
 */

// Do NOT mock logger.js in this file — we want real coverage.

import {
  createLogger,
  logger,
  authLogger,
  securityLogger,
  apiLogger,
  formLogger,
  LOG_LEVELS
} from '../../../src/utils/logger.js';

describe('logger.js real source — LOG_LEVELS', () => {
  it('ERROR = 0, WARN = 1, INFO = 2, DEBUG = 3', () => {
    expect(LOG_LEVELS.ERROR).toBe(0);
    expect(LOG_LEVELS.WARN).toBe(1);
    expect(LOG_LEVELS.INFO).toBe(2);
    expect(LOG_LEVELS.DEBUG).toBe(3);
  });
});

describe('logger.js real source — createLogger', () => {
  let spyError, spyWarn, spyInfo, spyLog, spyGroup, spyGroupEnd, spyTime, spyTimeEnd;

  beforeEach(() => {
    spyError = jest.spyOn(console, 'error').mockImplementation(() => {});
    spyWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    spyInfo = jest.spyOn(console, 'info').mockImplementation(() => {});
    spyLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    spyGroup = jest.spyOn(console, 'group').mockImplementation(() => {});
    spyGroupEnd = jest.spyOn(console, 'groupEnd').mockImplementation(() => {});
    spyTime = jest.spyOn(console, 'time').mockImplementation(() => {});
    spyTimeEnd = jest.spyOn(console, 'timeEnd').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('createLogger returns object with all methods', () => {
    const log = createLogger();
    ['error', 'warn', 'info', 'debug', 'group', 'groupEnd', 'security', 'time', 'timeEnd'].forEach(m => {
      expect(typeof log[m]).toBe('function');
    });
  });

  it('error() calls console.error with formatted message', () => {
    const log = createLogger();
    log.error('test error');
    expect(spyError).toHaveBeenCalled();
    expect(spyError.mock.calls[0][0]).toMatch(/ERROR.*test error/);
  });

  it('warn() calls console.warn', () => {
    const log = createLogger();
    log.warn('test warn');
    expect(spyWarn).toHaveBeenCalled();
    expect(spyWarn.mock.calls[0][0]).toMatch(/WARN.*test warn/);
  });

  it('info() calls console.info (DEV=true)', () => {
    const log = createLogger();
    log.info('test info');
    // In DEV mode (importMetaEnvPlugin sets DEV=true), info should be called
    expect(spyInfo).toHaveBeenCalled();
  });

  it('debug() calls console.log (DEV=true)', () => {
    const log = createLogger();
    log.debug('test debug');
    expect(spyLog).toHaveBeenCalled();
  });

  it('group() calls console.group (DEV=true)', () => {
    const log = createLogger();
    log.group('myGroup');
    expect(spyGroup).toHaveBeenCalledWith('myGroup');
  });

  it('groupEnd() calls console.groupEnd (DEV=true)', () => {
    const log = createLogger();
    log.groupEnd();
    expect(spyGroupEnd).toHaveBeenCalled();
  });

  it('security() calls console.warn with SECURITY prefix', () => {
    const log = createLogger();
    log.security('auth_event', { key: 'val' });
    expect(spyWarn).toHaveBeenCalled();
    expect(spyWarn.mock.calls[0][0]).toMatch(/SECURITY.*auth_event/);
  });

  it('time() calls console.time (DEV=true)', () => {
    const log = createLogger();
    log.time('t1');
    expect(spyTime).toHaveBeenCalledWith('t1');
  });

  it('timeEnd() calls console.timeEnd (DEV=true)', () => {
    const log = createLogger();
    log.timeEnd('t1');
    expect(spyTimeEnd).toHaveBeenCalledWith('t1');
  });

  it('prefix appears in output', () => {
    const log = createLogger('MYMOD');
    log.warn('msg');
    expect(spyWarn.mock.calls[0][0]).toMatch(/\[MYMOD\]/);
  });

  it('no brackets for empty prefix', () => {
    const log = createLogger('');
    log.error('msg');
    expect(spyError.mock.calls[0][0]).not.toMatch(/\[\]/);
  });

  it('extra args are forwarded', () => {
    const log = createLogger();
    const extra = { detail: 42 };
    log.error('msg', extra);
    const callArgs = spyError.mock.calls[0];
    expect(callArgs).toContain(extra);
  });
});

describe('logger.js real source — named loggers', () => {
  let spyWarn;
  beforeEach(() => { spyWarn = jest.spyOn(console, 'warn').mockImplementation(() => {}); });
  afterEach(() => { jest.restoreAllMocks(); });

  it('logger is an instance with methods', () => {
    expect(typeof logger.error).toBe('function');
  });

  it('authLogger uses [AUTH] prefix', () => {
    authLogger.warn('msg');
    expect(spyWarn.mock.calls[0][0]).toMatch(/\[AUTH\]/);
  });

  it('securityLogger uses [SECURITY] prefix', () => {
    securityLogger.warn('msg');
    expect(spyWarn.mock.calls[0][0]).toMatch(/\[SECURITY\]/);
  });

  it('apiLogger uses [API] prefix', () => {
    apiLogger.warn('msg');
    expect(spyWarn.mock.calls[0][0]).toMatch(/\[API\]/);
  });

  it('formLogger uses [FORMS] prefix', () => {
    formLogger.warn('msg');
    expect(spyWarn.mock.calls[0][0]).toMatch(/\[FORMS\]/);
  });
});
