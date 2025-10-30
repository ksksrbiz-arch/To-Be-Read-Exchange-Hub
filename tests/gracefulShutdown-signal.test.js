const GracefulShutdown = require('../src/utils/gracefulShutdown');

describe('GracefulShutdown signal handler', () => {
  let originalExit;
  beforeAll(() => {
    originalExit = process.exit;
    process.exit = jest.fn();
  });
  afterAll(() => {
    process.exit = originalExit;
  });

  test('SIGTERM triggers shutdown sequence without real exit in test env', async () => {
    const fakeServer = {
      on: jest.fn(),
      close: (cb) => cb && cb(),
      keepAliveTimeout: 0,
      headersTimeout: 0,
    };
    const fakePool = { end: jest.fn().mockResolvedValue() };
    const gs = new GracefulShutdown(fakeServer, fakePool, { timeout: 200 });
    expect(gs.isShuttingDown()).toBe(false);
    process.emit('SIGTERM');
    // Allow microtasks to flush
    await new Promise(r => setTimeout(r, 10));
    expect(gs.isShuttingDown()).toBe(true);
    // process.exit should not be called due to NODE_ENV==='test'
    expect(process.exit).not.toHaveBeenCalled();
  });
});
