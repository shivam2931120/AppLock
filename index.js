import { AppRegistry } from 'react-native';
import App from './App';
import { LockScreen } from './src/screens/LockScreen';
import { name as appName } from './app.json';

// Register main app
AppRegistry.registerComponent(appName, () => App);

// Register LockScreen for overlay activity
AppRegistry.registerComponent('LockScreen', () => LockScreen);
