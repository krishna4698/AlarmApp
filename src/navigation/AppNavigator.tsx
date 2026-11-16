import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { HomeScreen } from '../screens/HomeScreen';
import { SetAlarmScreen } from '../screens/SetAlarmScreen';
import { ActiveAlarmScreen } from '../screens/ActiveAlarmScreen';
import { PushUpChallengeScreen } from '../screens/PushUpChallengeScreen';
import { ChallengeCompletedScreen } from '../screens/ChallengeCompletedScreen';
import { Colors } from '../theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen
        name="SetAlarm"
        component={SetAlarmScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="ActiveAlarm"
        component={ActiveAlarmScreen}
        options={{
          gestureEnabled: false, // Prevent swiping away ringing alarm
        }}
      />
      <Stack.Screen
        name="PushUpChallenge"
        component={PushUpChallengeScreen}
        options={{
          gestureEnabled: false, // Prevent swiping away active challenge
        }}
      />
      <Stack.Screen
        name="ChallengeCompleted"
        component={ChallengeCompletedScreen}
        options={{
          gestureEnabled: false,
        }}
      />
    </Stack.Navigator>
  );
};
