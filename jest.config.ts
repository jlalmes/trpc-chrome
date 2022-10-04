// @ts-check

/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: './test',
  globals: {
    'ts-jest': {
      tsconfig: './tsconfig.json',
    },
  },
  setupFiles: ['./setup.ts'],
  snapshotFormat: {
    escapeString: true,
    printBasicPrototype: true,
  },
};
