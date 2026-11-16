import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing } from '../theme';
import { ChallengeCompletedScreenProps } from '../types/navigation';
import { NativeAlarmService } from '../services/nativeAlarmService';

export const ChallengeCompletedScreen: React.FC<ChallengeCompletedScreenProps> = ({ route, navigation }) => {
  const { completedReps = 20, alarmId = 'demo' } = route.params || {};

  const handleStopAlarm = async () => {
    // Stops the native Android foreground service and audio playback
    await NativeAlarmService.stopAlarm(alarmId);
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Celebration Header */}
        <View style={styles.contentBox}>
          <View style={styles.successBadge}>
            <Text style={styles.checkIcon}>✓</Text>
          </View>
          <Text style={styles.title}>CHALLENGE COMPLETED!</Text>
          <Text style={styles.subtitle}>
            Great job! You crushed all <Text style={styles.highlightReps}>{completedReps} push-ups</Text>.
          </Text>
          <Text style={styles.desc}>
            You have successfully proved you are awake. You may now silence your alarm.
          </Text>
        </View>

        {/* Unlocked Stop Alarm Button */}
        <View style={styles.bottomSection}>
          <TouchableOpacity
            style={styles.stopAlarmButton}
            activeOpacity={0.85}
            onPress={handleStopAlarm}
          >
            <Text style={styles.stopAlarmText}>STOP ALARM</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    justifyContent: 'space-between',
    paddingVertical: Spacing.xl,
  },
  contentBox: {
    alignItems: 'center',
    paddingTop: Spacing.xxl,
  },
  successBadge: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.successGlow,
    borderWidth: 2,
    borderColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  checkIcon: {
    fontSize: 44,
    color: Colors.success,
    fontWeight: '900',
  },
  title: {
    ...Typography.h1,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.bodyBold,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  highlightReps: {
    color: Colors.primary,
  },
  desc: {
    ...Typography.body,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: Spacing.lg,
  },
  bottomSection: {
    paddingBottom: Spacing.md,
  },
  stopAlarmButton: {
    backgroundColor: Colors.success,
    paddingVertical: Spacing.lg,
    borderRadius: Spacing.borderRadius.md,
    alignItems: 'center',
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  stopAlarmText: {
    ...Typography.bodyBold,
    color: '#000000',
    fontSize: 18,
    letterSpacing: 1,
  },
});
