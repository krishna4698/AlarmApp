/**
 * @format
 */

import {AppRegistry} from 'react-native';
import notifee, {EventType} from '@notifee/react-native';
import App from './App';
import {name as appName} from './app.json';
import {VolumeLockService} from './src/services/volumeLockService';

// Register background notification event handler for alarms
notifee.onBackgroundEvent(async ({type, detail}) => {
  const {notification} = detail;
  console.log('[Notifee] Background Event:', type, notification?.id);

  // When alarm notification is delivered in background, start the un-mutable MediaPlayer immediately
  if (type === EventType.DELIVERED) {
    VolumeLockService.startAlarmSound();
  }
});

// Register foreground service runner to ensure alarm sound and notifications persist
notifee.registerForegroundService((notification) => {
  // Start the dedicated un-mutable MediaPlayer immediately from the foreground service
  VolumeLockService.startAlarmSound();

  return new Promise(() => {
    // Keeps the Android foreground service running until explicitly stopped by the challenge completion
  });
});

AppRegistry.registerComponent(appName, () => App);
