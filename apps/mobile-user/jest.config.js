module.exports = {
  preset: 'react-native',
  testEnvironment: 'node',
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(?:.pnpm/)?((jest-)?react-native|@react-native|@react-navigation|react-native-safe-area-context|react-native-gesture-handler|react-native-reanimated|@react-native-community)/)',
  ],
};
