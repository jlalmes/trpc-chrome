/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  rootDir: './test',
  globals: {
    'ts-jest': {
      tsconfig: './tsconfig.json',
    },
  },
};
