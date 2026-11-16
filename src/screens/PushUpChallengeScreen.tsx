import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing } from '../theme';
import { PushUpChallengeScreenProps } from '../types/navigation';

export const PushUpChallengeScreen: React.FC<PushUpChallengeScreenProps> = ({ route, navigation }) => {
  const { pushUpTarget = 20, alarmId } = route.params || {};
  const [completedReps, setCompletedReps] = useState(0);

  const progressPercentage = Math.min(100, Math.round((completedReps / pushUpTarget) * 100));

  const handleSimulateRep = () => {
    const nextReps = completedReps + 1;
    setCompletedReps(nextReps);

    if (nextReps >= pushUpTarget) {
      navigation.replace('ChallengeCompleted', {
        alarmId: alarmId || 'demo',
        completedReps: nextReps,
      });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top HUD: Counter & Progress */}
        <View style={styles.hudTop}>
          <View style={styles.counterRow}>
            <Text style={styles.repCountText}>
              {completedReps} <Text style={styles.repTargetText}>/ {pushUpTarget}</Text>
            </Text>
            <View style={styles.statusPill}>
              <Text style={styles.statusText}>AI ACTIVE</Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${progressPercentage}%` }]} />
          </View>
          <Text style={styles.progressLabel}>{progressPercentage}% COMPLETED</Text>
        </View>

        {/* Center Camera Area Placeholder (Will host VisionCamera preview in Milestone 5) */}
        <View style={styles.cameraPlaceholder}>
          <Text style={styles.cameraGuideText}>[ CAMERA PREVIEW & AI POSE DETECTOR ]</Text>
          <Text style={styles.cameraSubText}>Place phone on floor with a side-view angle of your body</Text>
          <View style={styles.postureIndicator}>
            <Text style={styles.postureText}>Status: Waiting for Plank Position</Text>
          </View>
        </View>

        {/* Bottom Controls / Test Action */}
        <View style={styles.hudBottom}>
          <TouchableOpacity
            style={styles.testRepButton}
            activeOpacity={0.8}
            onPress={handleSimulateRep}
          >
            <Text style={styles.testRepText}>+ Simulate 1 Push-Up Rep (Test HUD)</Text>
          </TouchableOpacity>
          <Text style={styles.soundWarning}>⚠️ Alarm is still ringing in background</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  hudTop: {
    backgroundColor: 'rgba(22, 25, 34, 0.85)',
    borderRadius: Spacing.borderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  repCountText: {
    ...Typography.hero,
    fontSize: 48,
    color: Colors.textPrimary,
  },
  repTargetText: {
    fontSize: 24,
    color: Colors.textSecondary,
  },
  statusPill: {
    backgroundColor: Colors.cyanGlow,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Spacing.borderRadius.full,
    borderWidth: 1,
    borderColor: Colors.cyan,
  },
  statusText: {
    ...Typography.caption,
    color: Colors.cyan,
    fontWeight: '700',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  progressLabel: {
    ...Typography.caption,
    color: Colors.primaryLight,
    marginTop: Spacing.xs,
    textAlign: 'right',
    fontWeight: '700',
  },
  cameraPlaceholder: {
    flex: 1,
    marginVertical: Spacing.md,
    borderRadius: Spacing.borderRadius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  cameraGuideText: {
    ...Typography.h3,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  cameraSubText: {
    ...Typography.body,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  postureIndicator: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Spacing.borderRadius.full,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  postureText: {
    ...Typography.caption,
    color: Colors.warning,
    fontWeight: '600',
  },
  hudBottom: {
    gap: Spacing.sm,
  },
  testRepButton: {
    backgroundColor: Colors.surfaceLight,
    paddingVertical: Spacing.md,
    borderRadius: Spacing.borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  testRepText: {
    ...Typography.bodyBold,
    color: Colors.primary,
  },
  soundWarning: {
    ...Typography.caption,
    color: Colors.danger,
    textAlign: 'center',
  },
});
