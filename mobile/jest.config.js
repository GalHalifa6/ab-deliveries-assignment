module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
  },
  testMatch: ['**/?(*.)+(test).[jt]s?(x)'],
  clearMocks: true,
}
