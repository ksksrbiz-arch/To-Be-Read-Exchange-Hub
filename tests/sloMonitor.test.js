const { sloMonitor } = require('../src/utils/sloMonitor');

describe('SLO Monitor', () => {
  test('initial status has full error budget and zero requests', () => {
    const status = sloMonitor.getStatus();
    expect(Number(status.availability.current)).toBe(100);
    expect(Number(status.errorRate.current)).toBe(0);
    expect(Number(status.errorBudget.remaining)).toBe(100);
  });

  test('records success and error affecting availability and error rate', () => {
    sloMonitor.recordRequest(120, false); // success
    sloMonitor.recordRequest(200, true); // error
    const status = sloMonitor.getStatus();
    expect(Number(status.availability.current)).toBeLessThan(100);
    expect(Number(status.errorRate.current)).toBeGreaterThan(0);
    expect(Number(status.latency.p95)).toBeGreaterThanOrEqual(0);
  });

  test('percentile calculation returns highest for small set', () => {
    sloMonitor.recordRequest(10, false);
    sloMonitor.recordRequest(20, false);
    sloMonitor.recordRequest(30, false);
    const status = sloMonitor.getStatus();
    expect(Number(status.latency.p99)).toBeGreaterThanOrEqual(Number(status.latency.p95));
  });
});