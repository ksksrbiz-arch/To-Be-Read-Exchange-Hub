module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/config/database.js',
    // Include enterprise middleware/utilities now that tests exist
  ],
  coverageDirectory: 'coverage',
  testMatch: ['**/tests/**/*.test.js'],
  verbose: true,
  // Coverage thresholds raised after test-hardening (88.28/82.69/95.65/88.08 achieved)
  // Set conservatively below achieved to allow for future refactoring headroom
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 70,
      functions: 90,
      lines: 80,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.js'],
  transform: {
    // Handle ESM modules like uuid which ship "export" syntax
    '^.+\\.[jt]sx?$': 'babel-jest'
  },
  transformIgnorePatterns: [
    '/node_modules/(?!uuid/)'
  ],
  // Performance optimizations
  maxWorkers: '75%',
  maxConcurrency: 5,
  testTimeout: 10000,
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
  
  // Performance optimizations
  maxWorkers: '75%',
  maxConcurrency: 5,
  testTimeout: 10000,
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
};
