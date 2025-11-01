/**
 * Feature Flags System
 * Enterprise-grade feature toggles for safe rollouts and A/B testing
 */
class FeatureFlags {
  constructor() {
    this.flags = new Map();
    this.loadFromEnvironment();
  }

  /**
   * Load feature flags from environment variables
   * Format: FEATURE_FLAG_<NAME>=true|false|percentage
   */
  loadFromEnvironment() {
    const flagPrefix = 'FEATURE_FLAG_';
    
    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith(flagPrefix)) {
        const flagName = key.substring(flagPrefix.length).toLowerCase();
        this.setFlag(flagName, this.parseValue(value));
      }
    }

    // Default flags
    this.setDefaultFlags();
  }

  /**
   * Set default feature flags
   */
  setDefaultFlags() {
    const defaults = {
      api_versioning: true,
      bulk_operations: true,
      enrichment: true,
      circuit_breaker: true,
      api_key_auth: process.env.API_KEY_ENABLED === 'true',
      rate_limiting: true,
      prometheus_metrics: true,
      correlation_ids: true,
      advanced_logging: true,
      // New features (disabled by default for safe rollout)
      auto_categorization: false,
      ml_recommendations: false,
      real_time_notifications: false,
      batch_processing: false,
    };

    for (const [name, value] of Object.entries(defaults)) {
      if (!this.flags.has(name)) {
        this.setFlag(name, value);
      }
    }
  }

  /**
   * Parse flag value from string
   */
  parseValue(value) {
    if (value === 'true') return true;
    if (value === 'false') return false;
    
    // Percentage rollout (0-100)
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= 0 && num <= 100) {
      return num;
    }
    
    return false;
  }

  /**
   * Set a feature flag
   */
  setFlag(name, value) {
    this.flags.set(name.toLowerCase(), value);
  }

  /**
   * Check if a feature is enabled
   * For percentage rollouts, uses consistent hashing based on identifier
   */
  isEnabled(flagName, identifier = null) {
    const flag = this.flags.get(flagName.toLowerCase());
    
    if (flag === undefined) return false;
    if (typeof flag === 'boolean') return flag;
    
    // Percentage rollout
    if (typeof flag === 'number' && identifier) {
      const hash = this.hashIdentifier(identifier);
      return hash <= flag;
    }
    
    return false;
  }

  /**
   * Hash an identifier to a number between 0-100
   * Consistent hashing ensures same user always gets same result
   */
  hashIdentifier(identifier) {
    let hash = 0;
    for (let i = 0; i < identifier.length; i++) {
      hash = ((hash << 5) - hash) + identifier.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) % 100;
  }

  /**
   * Get all flags (for admin dashboard)
   */
  getAllFlags() {
    return Object.fromEntries(this.flags);
  }

  /**
   * Middleware to expose feature flags to requests
   */
  middleware() {
    return (req, res, next) => {
      req.features = {
        isEnabled: (flagName) => this.isEnabled(flagName, req.id || req.ip),
        getAll: () => this.getAllFlags(),
      };
      next();
    };
  }
}

// Singleton instance
const featureFlags = new FeatureFlags();

module.exports = featureFlags;
