module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: [
    '<rootDir>/tests/**/*.test.js'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/logs/',
    '<rootDir>/legacy/public/',
    '<rootDir>/uploads/',
    '<rootDir>/client/'
  ],
  collectCoverage: false,
  coverageDirectory: '<rootDir>/coverage',
  collectCoverageFrom: [
    'src/application/auth/auth.service.js',
    'src/application/auth/auth.schemas.js',
    'src/application/matching/matching.service.js',
    'src/adapters/outbound/ai/triage-agent.adapter.js',
    'src/shared/errors/AppError.js',
    'src/adapters/inbound/http/middleware/auth.js',
    'src/adapters/inbound/http/middleware/errorHandler.js',
    '!tests/**/*.js',
    '!**/node_modules/**'
  ],
  coverageReporters: ['text', 'text-summary', 'html', 'lcov'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  moduleDirectories: ['node_modules', '<rootDir>/src'],
  transform: {},
  clearMocks: true,
  restoreMocks: true,
  testTimeout: 30000,
  verbose: true,
  detectOpenHandles: true,
  maxWorkers: '50%',
  moduleNameMapper: {},
  moduleFileExtensions: ['js', 'json', 'node']
};
