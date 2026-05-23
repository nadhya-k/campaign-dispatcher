export default {
  preset: "ts-jest",
  testEnvironment: "node",
  transformIgnorePatterns: ["node_modules/(?!(uuid)/)"],
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  collectCoverageFrom: ["src/**/*.ts", "!src/__tests__/**", "!src/index.ts"],
  coverageThreshold: {
    global: { branches: 70, functions: 80 },
  },
};
