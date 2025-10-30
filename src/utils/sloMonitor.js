/**
 * Service Level Objectives (SLO) Monitoring
 * Tracks and reports on SLIs/SLOs for enterprise reliability
 */
const { Histogram, Gauge } = require('prom-client');

// SLI Metrics
const sloAvailability = new Gauge({
  name: 'slo_availability_ratio',
  help: 'Service availability ratio (successful requests / total requests)',
  labelNames: ['period'],
});

const sloLatency = new Histogram({
  name: 'slo_latency_p99',
  help: 'P99 latency for API requests',
  labelNames: ['endpoint'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

const sloErrorBudget = new Gauge({
  name: 'slo_error_budget_remaining',
  help: 'Remaining error budget percentage',
  labelNames: ['period'],
});

/**
 * SLO Definitions
 * These define the service level objectives for the application
 */
const SLO_DEFINITIONS = {
  // 99.9% availability (43.8 minutes downtime per month)
  availability: {
    target: 99.9,
    period: '30d',
    description: '3-nines availability',
  },
  
  // 95% of requests under 200ms, 99% under 1s
  latency: {
    p95: 200, // milliseconds
    p99: 1000,
    description: 'Fast response times',
  },
  
  // Error rate under 0.1%
  errorRate: {
    target: 0.1,
    description: 'Low error rate',
  },
};

class SLOMonitor {
  constructor() {
    this.metrics = {
      requests: { success: 0, total: 0 },
      latencies: [],
      errors: [],
      lastReset: Date.now(),
    };
    
    this.WINDOW_SIZE = 30 * 24 * 60 * 60 * 1000; // 30 days
  }

  /**
   * Record a request
   */
  recordRequest(durationMs, isError = false) {
  this.metrics.requests.total++;
  if (!isError) this.metrics.requests.success++;
    
    this.metrics.latencies.push({
      value: durationMs,
      timestamp: Date.now(),
    });

    if (isError) {
      this.metrics.errors.push({
        timestamp: Date.now(),
      });
    }

    // Clean old data
    this.cleanOldData();
    
    // Update Prometheus metrics
    this.updateMetrics();
  }

  /**
   * Remove data outside the window
   */
  cleanOldData() {
    const cutoff = Date.now() - this.WINDOW_SIZE;
    
    this.metrics.latencies = this.metrics.latencies.filter(
      item => item.timestamp > cutoff
    );
    
    this.metrics.errors = this.metrics.errors.filter(
      item => item.timestamp > cutoff
    );
  }

  /**
   * Calculate current availability
   */
  calculateAvailability() {
  if (this.metrics.requests.total === 0) return 100;
  return (this.metrics.requests.success / this.metrics.requests.total) * 100;
  }

  /**
   * Calculate error rate
   */
  calculateErrorRate() {
  if (this.metrics.requests.total === 0) return 0;
  return (this.metrics.errors.length / this.metrics.requests.total) * 100;
  }

  /**
   * Calculate percentile latency
   */
  calculatePercentile(percentile) {
    if (this.metrics.latencies.length === 0) return 0;
    
    const sorted = this.metrics.latencies
      .map(item => item.value)
      .sort((a, b) => a - b);
    
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }

  /**
   * Calculate remaining error budget
   */
  calculateErrorBudget() {
    const availability = this.calculateAvailability();
    const targetAvailability = SLO_DEFINITIONS.availability.target;
    
  const allowedErrors = (100 - targetAvailability) * this.metrics.requests.total / 100;
    const actualErrors = this.metrics.errors.length;
  if (allowedErrors === 0) return 100; // No traffic yet => full budget remaining
  return Math.max(0, ((allowedErrors - actualErrors) / allowedErrors) * 100);
  }

  /**
   * Update Prometheus metrics
   */
  updateMetrics() {
    const availability = this.calculateAvailability();
    const errorBudget = this.calculateErrorBudget();
    
    sloAvailability.set({ period: '30d' }, availability);
    sloErrorBudget.set({ period: '30d' }, errorBudget);
  }

  /**
   * Get SLO status report
   */
  getStatus() {
    const availability = this.calculateAvailability();
    const errorRate = this.calculateErrorRate();
    const p95Latency = this.calculatePercentile(95);
    const p99Latency = this.calculatePercentile(99);
    const errorBudget = this.calculateErrorBudget();

    return {
      availability: {
        current: availability.toFixed(3),
        target: SLO_DEFINITIONS.availability.target,
        status: availability >= SLO_DEFINITIONS.availability.target ? 'met' : 'breached',
      },
      latency: {
        p95: p95Latency.toFixed(2),
        p95_target: SLO_DEFINITIONS.latency.p95,
        p95_status: p95Latency <= SLO_DEFINITIONS.latency.p95 ? 'met' : 'breached',
        p99: p99Latency.toFixed(2),
        p99_target: SLO_DEFINITIONS.latency.p99,
        p99_status: p99Latency <= SLO_DEFINITIONS.latency.p99 ? 'met' : 'breached',
      },
      errorRate: {
        current: errorRate.toFixed(3),
        target: SLO_DEFINITIONS.errorRate.target,
        status: errorRate <= SLO_DEFINITIONS.errorRate.target ? 'met' : 'breached',
      },
      errorBudget: {
        remaining: errorBudget.toFixed(2),
        status: errorBudget > 0 ? 'healthy' : 'exhausted',
      },
      summary: {
        totalRequests: this.metrics.requests.total,
        successfulRequests: this.metrics.requests.success,
        failedRequests: this.metrics.errors.length,
        windowSize: '30 days',
      },
    };
  }
}

// Singleton instance
const sloMonitor = new SLOMonitor();

module.exports = {
  sloMonitor,
  SLO_DEFINITIONS,
};
