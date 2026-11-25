module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/testcases'],
  testMatch: ['**/*.test.js', '**/*.spec.js'],
  setupFilesAfterEnv: ['<rootDir>/config/jest.setup.js'],
  testTimeout: Number(process.env.JEST_TIMEOUT_MS || 30000),
  clearMocks: true,
  verbose: true
};
