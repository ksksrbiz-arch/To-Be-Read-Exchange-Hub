// Unit tests for feature flag percentage rollout and boolean flags
const featureFlags = require('../src/utils/featureFlags');

describe('FeatureFlags: boolean flags', () => {
  test('default boolean flag enrichment is enabled', () => {
    expect(featureFlags.isEnabled('enrichment', 'user-1')).toBe(true);
  });

  test('disabled flag returns false', () => {
    expect(featureFlags.isEnabled('auto_categorization', 'user-1')).toBe(false);
  });
});

describe('FeatureFlags: percentage rollout', () => {
  const FLAG_NAME = 'test_percentage_flag';
  beforeAll(() => {
    featureFlags.setFlag(FLAG_NAME, 50); // 50% rollout
  });

  test('hashIdentifier produces stable results', () => {
    const first = featureFlags.isEnabled(FLAG_NAME, 'consistent-user');
    const second = featureFlags.isEnabled(FLAG_NAME, 'consistent-user');
    expect(first).toBe(second);
  });

  test('different users show distribution (non-deterministic check)', () => {
    const samples = Array.from({ length: 100 }, (_, i) => featureFlags.isEnabled(FLAG_NAME, 'user-' + i));
    const enabledCount = samples.filter(Boolean).length;
    // Expect roughly near 50 enabled; allow wide variance but ensure not extreme
    expect(enabledCount).toBeGreaterThan(20);
    expect(enabledCount).toBeLessThan(80);
  });
  
  test('parseValue handles primitives and invalid gracefully', () => {
    featureFlags.setFlag('pv_true', featureFlags.parseValue('true'));
    featureFlags.setFlag('pv_false', featureFlags.parseValue('false'));
    featureFlags.setFlag('pv_pct', featureFlags.parseValue('30'));
    featureFlags.setFlag('pv_bad', featureFlags.parseValue('not-a-number'));
    expect(featureFlags.isEnabled('pv_true')).toBe(true);
    expect(featureFlags.isEnabled('pv_false')).toBe(false);
    // Percentage requires identifier
    expect(featureFlags.isEnabled('pv_pct')).toBe(false);
    expect(typeof featureFlags.getAllFlags().pv_pct).toBe('number');
    expect(featureFlags.getAllFlags().pv_bad).toBe(false);
  });
});
