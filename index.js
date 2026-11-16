/**
 * @format
 */

import {AppRegistry} from 'react-native';
import notifee, {EventType} from '@notifee/react-native';
import App from './App';
import {name as appName} from './app.json';

// Register background notification event handler for alarms
notifee.onBackgroundEvent(async ({type, detail}) => {
  const {notification, pressAction} = detail;
  console.log('[Notifee] Background Event:', type, notification?.id);
});

// Register foreground service runner to ensure alarm sound and notifications persist
notifee.registerForegroundService((notification) => {
  return new Promise(() => {
    // Keeps the Android foreground service running until explicitly stopped by the challenge completion
  });
});

AppRegistry.registerComponent(appName, () => App);
