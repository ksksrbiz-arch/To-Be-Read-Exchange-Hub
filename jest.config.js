module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: ['src/**/*.js', '!src/server.js', '!src/config/database.js'],
  coverageDirectory: 'coverage',
  testMatch: ['**/tests/**/*.test.js'],
  verbose: true,
  // Initial thresholds (will raise as test suite matures)
  coverageThreshold: {
    global: {
      statements: 60,
      branches: 40,
      functions: 40,
      lines: 60,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.js'],
};
