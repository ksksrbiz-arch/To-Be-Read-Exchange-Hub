const logger = require('../utils/logger');

/**
 * Batch Upload Metrics Tracker
 * Collects metrics for monitoring and observability
 */

class BatchMetrics {
  constructor() {
    // In-memory metrics storage
    // In production, use Prometheus, StatsD, or similar
    this.metrics = {
      batches: {
        total: 0,
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
      },
      books: {
        total: 0,
        successful: 0,
        failed: 0,
        queued: 0,
      },
      enrichment: {
        totalCalls: 0,
        gemini: 0,
        claude: 0,
        openai: 0,
        success: 0,
        failed: 0,
        avgResponseTime: 0,
        totalCost: 0, // in USD
      },
      images: {
        uploaded: 0,
        aiGenerated: 0,
        failed: 0,
      },
      shelves: {
        allocations: 0,
        overflowCreated: 0,
        avgUtilization: 0,
      },
      queue: {
        depth: 0,
        avgProcessingTime: 0,
        oldestItemAge: 0,
      },
    };

    // Track response times for averaging
    this.enrichmentResponseTimes = [];
    this.processingTimes = [];
  }

  /**
   * Record batch creation
   */
  recordBatchCreated(totalBooks) {
    this.metrics.batches.total++;
    this.metrics.batches.pending++;
    this.metrics.books.total += totalBooks;
    this.metrics.books.queued += totalBooks;

    logger.info('Batch metrics: Batch created', {
      total_batches: this.metrics.batches.total,
      total_books: this.metrics.books.total,
    });
  }

  /**
   * Update batch status
   */
  updateBatchStatus(oldStatus, newStatus) {
    if (oldStatus) {
      this.metrics.batches[oldStatus] = Math.max(0, this.metrics.batches[oldStatus] - 1);
    }
    if (newStatus) {
      this.metrics.batches[newStatus]++;
    }
  }

  /**
   * Record book processing result
   */
  recordBookProcessed(success) {
    this.metrics.books.queued = Math.max(0, this.metrics.books.queued - 1);
    
    if (success) {
      this.metrics.books.successful++;
    } else {
      this.metrics.books.failed++;
    }
  }

  /**
   * Record AI enrichment call
   */
  recordEnrichment(provider, success, responseTime, cost = 0) {
    this.metrics.enrichment.totalCalls++;
    this.metrics.enrichment[provider.toLowerCase()]++;

    if (success) {
      this.metrics.enrichment.success++;
    } else {
      this.metrics.enrichment.failed++;
    }

    this.metrics.enrichment.totalCost += cost;

    // Track response time for averaging
    this.enrichmentResponseTimes.push(responseTime);
    if (this.enrichmentResponseTimes.length > 100) {
      this.enrichmentResponseTimes.shift(); // Keep only last 100
    }

    this.metrics.enrichment.avgResponseTime =
      this.enrichmentResponseTimes.reduce((a, b) => a + b, 0) / this.enrichmentResponseTimes.length;

    logger.info('Enrichment metrics', {
      provider,
      success,
      responseTime,
      cost,
      totalCost: this.metrics.enrichment.totalCost.toFixed(4),
    });
  }

  /**
   * Record image handling
   */
  recordImage(type, success = true) {
    if (success) {
      if (type === 'uploaded') {
        this.metrics.images.uploaded++;
      } else if (type === 'generated') {
        this.metrics.images.aiGenerated++;
      }
    } else {
      this.metrics.images.failed++;
    }
  }

  /**
   * Record shelf allocation
   */
  recordShelfAllocation(isOverflow = false) {
    this.metrics.shelves.allocations++;
    if (isOverflow) {
      this.metrics.shelves.overflowCreated++;
    }
  }

  /**
   * Update shelf utilization
   */
  updateShelfUtilization(utilization) {
    // Running average
    const count = this.metrics.shelves.allocations;
    this.metrics.shelves.avgUtilization =
      (this.metrics.shelves.avgUtilization * (count - 1) + utilization) / count;
  }

  /**
   * Update queue depth
   */
  updateQueueDepth(depth) {
    this.metrics.queue.depth = depth;
  }

  /**
   * Record processing time
   */
  recordProcessingTime(timeMs) {
    this.processingTimes.push(timeMs);
    if (this.processingTimes.length > 100) {
      this.processingTimes.shift();
    }

    this.metrics.queue.avgProcessingTime =
      this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length;
  }

  /**
   * Get all metrics for export
   */
  getMetrics() {
    return {
      ...this.metrics,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get Prometheus-format metrics
   */
  getPrometheusMetrics() {
    const m = this.metrics;
    const lines = [];

    // Batch metrics
    lines.push('# HELP batch_uploads_total Total number of batch uploads');
    lines.push('# TYPE batch_uploads_total counter');
    lines.push(`batch_uploads_total ${m.batches.total}`);

    lines.push('# HELP batch_uploads_by_status Batch uploads by status');
    lines.push('# TYPE batch_uploads_by_status gauge');
    ['pending', 'processing', 'completed', 'failed'].forEach(status => {
      lines.push(`batch_uploads_by_status{status="${status}"} ${m.batches[status]}`);
    });

    // Book metrics
    lines.push('# HELP books_processed_total Total books processed');
    lines.push('# TYPE books_processed_total counter');
    lines.push(`books_processed_total ${m.books.successful + m.books.failed}`);

    lines.push('# HELP books_queued Current books in queue');
    lines.push('# TYPE books_queued gauge');
    lines.push(`books_queued ${m.books.queued}`);

    // Enrichment metrics
    lines.push('# HELP enrichment_api_calls_total Total AI API calls');
    lines.push('# TYPE enrichment_api_calls_total counter');
    ['gemini', 'claude', 'openai'].forEach(provider => {
      lines.push(`enrichment_api_calls_total{provider="${provider}"} ${m.enrichment[provider]}`);
    });

    lines.push('# HELP enrichment_success_rate Enrichment success rate');
    lines.push('# TYPE enrichment_success_rate gauge');
    const successRate = m.enrichment.totalCalls > 0
      ? m.enrichment.success / m.enrichment.totalCalls
      : 0;
    lines.push(`enrichment_success_rate ${successRate.toFixed(4)}`);

    lines.push('# HELP enrichment_cost_total Total enrichment cost in USD');
    lines.push('# TYPE enrichment_cost_total counter');
    lines.push(`enrichment_cost_total ${m.enrichment.totalCost.toFixed(4)}`);

    lines.push('# HELP enrichment_response_time_avg Average AI API response time (ms)');
    lines.push('# TYPE enrichment_response_time_avg gauge');
    lines.push(`enrichment_response_time_avg ${m.enrichment.avgResponseTime.toFixed(2)}`);

    // Image metrics
    lines.push('# HELP images_total Total images processed');
    lines.push('# TYPE images_total counter');
    lines.push(`images_total{type="uploaded"} ${m.images.uploaded}`);
    lines.push(`images_total{type="generated"} ${m.images.aiGenerated}`);
    lines.push(`images_total{type="failed"} ${m.images.failed}`);

    // Shelf metrics
    lines.push('# HELP shelf_allocations_total Total shelf allocations');
    lines.push('# TYPE shelf_allocations_total counter');
    lines.push(`shelf_allocations_total ${m.shelves.allocations}`);

    lines.push('# HELP shelf_overflow_created_total Overflow shelves created');
    lines.push('# TYPE shelf_overflow_created_total counter');
    lines.push(`shelf_overflow_created_total ${m.shelves.overflowCreated}`);

    lines.push('# HELP shelf_utilization_avg Average shelf utilization percentage');
    lines.push('# TYPE shelf_utilization_avg gauge');
    lines.push(`shelf_utilization_avg ${m.shelves.avgUtilization.toFixed(2)}`);

    // Queue metrics
    lines.push('# HELP queue_depth Current queue depth');
    lines.push('# TYPE queue_depth gauge');
    lines.push(`queue_depth ${m.queue.depth}`);

    lines.push('# HELP queue_processing_time_avg Average processing time per book (ms)');
    lines.push('# TYPE queue_processing_time_avg gauge');
    lines.push(`queue_processing_time_avg ${m.queue.avgProcessingTime.toFixed(2)}`);

    return lines.join('\n');
  }

  /**
   * Reset all metrics (for testing)
   */
  reset() {
    this.metrics = {
      batches: { total: 0, pending: 0, processing: 0, completed: 0, failed: 0 },
      books: { total: 0, successful: 0, failed: 0, queued: 0 },
      enrichment: {
        totalCalls: 0,
        gemini: 0,
        claude: 0,
        openai: 0,
        success: 0,
        failed: 0,
        avgResponseTime: 0,
        totalCost: 0,
      },
      images: { uploaded: 0, aiGenerated: 0, failed: 0 },
      shelves: { allocations: 0, overflowCreated: 0, avgUtilization: 0 },
      queue: { depth: 0, avgProcessingTime: 0, oldestItemAge: 0 },
    };
    this.enrichmentResponseTimes = [];
    this.processingTimes = [];
  }
}

// Singleton instance
const batchMetrics = new BatchMetrics();

module.exports = batchMetrics;
