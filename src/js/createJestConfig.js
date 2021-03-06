const createJestConfig = () => ({
    collectCoverage: false,
    collectCoverageFrom: ['src/**/*.js', 'src/**/*.jsx'],
    coveragePathIgnorePatterns: [],
    coverageReporters: ['cobertura', 'html', 'text'],
    coverageThreshold: {
        global: {
            branches: 75,
            functions: 80,
            lines: 70,
            statements: 70,
        },
    },
    testMatch: ['<rootDir>/**/__tests__/**/*.test.js', '<rootDir>/**/*.test.js'],
    testEnvironment: 'node',
    testPathIgnorePatterns: ['/node_modules/', '<rootDir>/lib/', '<rootDir>/es/'],
    setupTestFrameworkScriptFile: '<rootDir>/jest.setup.js',
});

export default createJestConfig;
