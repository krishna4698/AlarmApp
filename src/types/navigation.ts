import { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Home: undefined;
  SetAlarm: { alarmId?: string } | undefined;
  ActiveAlarm: { alarmId: string; pushUpTarget: number; label?: string };
  PushUpChallenge: { alarmId: string; pushUpTarget: number };
  ChallengeCompleted: { alarmId: string; completedReps: number };
};

export type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;
export type SetAlarmScreenProps = NativeStackScreenProps<RootStackParamList, 'SetAlarm'>;
export type ActiveAlarmScreenProps = NativeStackScreenProps<RootStackParamList, 'ActiveAlarm'>;
export type PushUpChallengeScreenProps = NativeStackScreenProps<RootStackParamList, 'PushUpChallenge'>;
export type ChallengeCompletedScreenProps = NativeStackScreenProps<RootStackParamList, 'ChallengeCompleted'>;
