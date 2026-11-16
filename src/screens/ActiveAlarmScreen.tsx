import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing } from '../theme';
import { ActiveAlarmScreenProps } from '../types/navigation';
import { NativeAlarmService } from '../services/nativeAlarmService';
import { VolumeLockService } from '../services/volumeLockService';

export const ActiveAlarmScreen: React.FC<ActiveAlarmScreenProps> = ({ route, navigation }) => {
  const { alarmId = 'demo', pushUpTarget = 20, label = 'Morning Alarm' } = route.params || {};

  // Start dedicated un-mutable alarm MediaPlayer & lock volume buttons
  useEffect(() => {
    VolumeLockService.startAlarmSound();
  }, []);

  const handleEmergencyDismiss = () => {
    Alert.alert(
      'Emergency Dismissal',
      'Are you sure you want to bypass the push-up challenge? Use this only for emergencies.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Bypass Alarm',
          style: 'destructive',
          onPress: async () => {
            VolumeLockService.stopAlarmSound();
            await NativeAlarmService.stopAlarm(alarmId);
            navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Pulsing Alarm Header */}
        <View style={styles.header}>
          <View style={styles.alarmIndicator}>
            <View style={styles.pulseDot} />
            <Text style={styles.alarmStatus}>ALARM RINGING</Text>
          </View>
          <Text style={styles.alarmTime}>06:30 <Text style={styles.alarmPeriod}>AM</Text></Text>
          <Text style={styles.alarmLabel}>{label}</Text>
        </View>

        {/* Challenge Requirement Card */}
        <View style={styles.challengeBox}>
          <Text style={styles.challengeBadge}>REQUIRED CHALLENGE</Text>
          <Text style={styles.challengeReps}>{pushUpTarget} Push-Ups</Text>
          <Text style={styles.challengeDesc}>
            Camera AI will track your reps in real time. Alarm will continue ringing until all reps are completed.
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actionGroup}>
          <TouchableOpacity
            style={styles.startChallengeButton}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('PushUpChallenge', {
              alarmId: route.params?.alarmId || 'demo',
              pushUpTarget,
            })}
          >
            <Text style={styles.startChallengeText}>START CHALLENGE NOW</Text>
          </TouchableOpacity>

          {/* Disabled Dismiss Button */}
          <View style={styles.lockedDismissButton}>
            <Text style={styles.lockedDismissText}>🔒 Stop Alarm (Locked until reps complete)</Text>
          </View>

          {/* Emergency Safety Valve */}
          <TouchableOpacity
            style={styles.emergencyButton}
            onPress={handleEmergencyDismiss}
          >
            <Text style={styles.emergencyText}>Emergency Dismiss</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#120505', // Deep dark alarm tint
  },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    justifyContent: 'space-between',
    paddingVertical: Spacing.lg,
  },
  header: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
  },
  alarmIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dangerGlow,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Spacing.borderRadius.full,
    marginBottom: Spacing.md,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.danger,
    marginRight: Spacing.xs,
  },
  alarmStatus: {
    ...Typography.caption,
    color: Colors.danger,
    fontWeight: '800',
    letterSpacing: 2,
  },
  alarmTime: {
    ...Typography.hero,
    fontSize: 64,
    color: Colors.textPrimary,
  },
  alarmPeriod: {
    fontSize: 28,
    color: Colors.primary,
  },
  alarmLabel: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  challengeBox: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.borderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  challengeBadge: {
    ...Typography.caption,
    color: Colors.primary,
    letterSpacing: 2,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  challengeReps: {
    ...Typography.h1,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  challengeDesc: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
  actionGroup: {
    gap: Spacing.sm,
  },
  startChallengeButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.lg,
    borderRadius: Spacing.borderRadius.md,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  startChallengeText: {
    ...Typography.bodyBold,
    color: '#000000',
    fontSize: 17,
    letterSpacing: 1,
  },
  lockedDismissButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: Spacing.md,
    borderRadius: Spacing.borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  lockedDismissText: {
    ...Typography.caption,
    color: Colors.textMuted,
  },
  emergencyButton: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  emergencyText: {
    ...Typography.caption,
    color: Colors.textMuted,
    textDecorationLine: 'underline',
  },
});
