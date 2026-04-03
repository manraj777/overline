jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');

  const MapView = ({ children }) => React.createElement(View, null, children);
  const Marker = ({ children }) => React.createElement(View, null, children);

  return {
    __esModule: true,
    default: MapView,
    Marker,
  };
});
