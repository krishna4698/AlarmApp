import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import notifee, { EventType } from '@notifee/react-native';
import { AppNavigator } from './src/navigation/AppNavigator';
import { navigationRef, navigate } from './src/navigation/RootNavigation';
import { NativeAlarmService } from './src/services/nativeAlarmService';
import { Colors } from './src/theme';

export default function App(): React.JSX.Element {
  useEffect(() => {
    // 1. Initialize native alarm channel and sync all saved alarms with AlarmManager
    async function setupAlarms() {
      await NativeAlarmService.initialize();
      await NativeAlarmService.syncAllAlarms();

      // 2. Check if the app was launched by an active alarm notification (from cold boot / locked state)
      const initialNotification = await notifee.getInitialNotification();
      if (initialNotification?.notification?.data?.alarmId) {
        const { alarmId, pushUpTarget, label } = initialNotification.notification.data;
        setTimeout(() => {
          navigate('ActiveAlarm', {
            alarmId: String(alarmId),
            pushUpTarget: Number(pushUpTarget) || 20,
            label: String(label || 'Push-Up Alarm'),
          });
        }, 500);
      }
    }

    setupAlarms();

    // 3. Handle alarm events while app is open in foreground
    const unsubscribe = notifee.onForegroundEvent(({ type, detail }) => {
      const { notification, pressAction } = detail;

      if (
        (type === EventType.DELIVERED || type === EventType.ACTION_PRESS || type === EventType.PRESS) &&
        notification?.data?.alarmId
      ) {
        const { alarmId, pushUpTarget, label } = notification.data;
        navigate('ActiveAlarm', {
          alarmId: String(alarmId),
          pushUpTarget: Number(pushUpTarget) || 20,
          label: String(label || 'Push-Up Alarm'),
        });
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle="light-content"
        backgroundColor={Colors.background}
        translucent={false}
      />
      <NavigationContainer ref={navigationRef}>
        <AppNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
