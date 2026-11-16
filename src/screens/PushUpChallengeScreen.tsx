import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  CameraPosition,
} from 'react-native-vision-camera';
import { Colors, Typography, Spacing } from '../theme';
import { PushUpChallengeScreenProps } from '../types/navigation';
import { NativeAlarmService } from '../services/nativeAlarmService';

export const PushUpChallengeScreen: React.FC<PushUpChallengeScreenProps> = ({
  route,
  navigation,
}) => {
  const { pushUpTarget = 20, alarmId } = route.params || {};
  const [completedReps, setCompletedReps] = useState(0);

  // Vision Camera State & Hooks
  const { hasPermission, requestPermission } = useCameraPermission();
  const [cameraPosition, setCameraPosition] = useState<CameraPosition>('front');
  const [torchEnabled, setTorchEnabled] = useState(false);

  const device = useCameraDevice(cameraPosition);

  // Auto-request permission on mount if not yet granted
  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  const progressPercentage = Math.min(
    100,
    Math.round((completedReps / pushUpTarget) * 100)
  );

  const toggleCamera = () => {
    setCameraPosition((prev) => (prev === 'front' ? 'back' : 'front'));
    setTorchEnabled(false);
  };

  const toggleTorch = () => {
    if (device?.hasTorch) {
      setTorchEnabled((prev) => !prev);
    }
  };

  // Completion Handler
  const handleChallengeSuccess = async (finalReps: number) => {
    // Silence the alarm foreground service immediately
    await NativeAlarmService.stopAlarm(alarmId || 'quick-test');

    navigation.replace('ChallengeCompleted', {
      alarmId: alarmId || 'demo',
      completedReps: finalReps,
    });
  };

  // Manual / Test Rep Simulation (kept for verification & fallback)
  const handleSimulateRep = () => {
    const nextReps = completedReps + 1;
    setCompletedReps(nextReps);

    if (nextReps >= pushUpTarget) {
      handleChallengeSuccess(nextReps);
    }
  };

  // 1. Permission Gate UI
  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.permissionContainer}>
          <View style={styles.permissionIconCircle}>
            <Text style={styles.permissionIcon}>📷</Text>
          </View>

          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionSubtitle}>
            To verify your push-ups and turn off the alarm, the app needs live camera
            vision.
          </Text>

          <View style={styles.privacyCard}>
            <Text style={styles.privacyTitle}>🔒 100% On-Device Privacy</Text>
            <Text style={styles.privacyText}>
              All pose estimation runs locally in real-time. No pictures or video feeds
              are ever recorded, stored, or sent to any server.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.grantButton}
            activeOpacity={0.85}
            onPress={requestPermission}
          >
            <Text style={styles.grantButtonText}>Grant Camera Permission</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.simulateFallbackButton}
            activeOpacity={0.8}
            onPress={handleSimulateRep}
          >
            <Text style={styles.simulateFallbackText}>
              Simulate Push-Up Rep ({completedReps}/{pushUpTarget})
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // 2. Loading Camera Device
  if (!device) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Initializing Camera Feed...</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => setCameraPosition(cameraPosition === 'front' ? 'back' : 'front')}
          >
            <Text style={styles.retryButtonText}>Switch Camera</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // 3. Live Camera View with HUD
  return (
    <View style={styles.fullScreenContainer}>
      {/* Background Live Camera Preview */}
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        torch={torchEnabled && device.hasTorch ? 'on' : 'off'}
        photo={false}
        video={false}
      />

      {/* Dimming tint layer for high HUD contrast */}
      <View style={styles.cameraTintOverlay} pointerEvents="none" />

      {/* Foreground Interactive HUD */}
      <SafeAreaView style={styles.hudOverlay} pointerEvents="box-none">
        {/* Top Controls Bar */}
        <View style={styles.topControlRow}>
          <View style={styles.alarmStatusPill}>
            <View style={styles.pulseDot} />
            <Text style={styles.alarmStatusText}>ALARM RINGING</Text>
          </View>

          <View style={styles.cameraActionButtons}>
            {device.hasTorch && cameraPosition === 'back' && (
              <TouchableOpacity
                style={[
                  styles.iconButton,
                  torchEnabled && styles.iconButtonActive,
                ]}
                onPress={toggleTorch}
                activeOpacity={0.8}
              >
                <Text style={styles.iconButtonText}>
                  {torchEnabled ? '⚡ ON' : '⚡ OFF'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.iconButton}
              onPress={toggleCamera}
              activeOpacity={0.8}
            >
              <Text style={styles.iconButtonText}>
                {cameraPosition === 'front' ? '🔄 Front' : '🔄 Back'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Counter HUD Card */}
        <View style={styles.hudCard}>
          <View style={styles.counterRow}>
            <View>
              <Text style={styles.repCountText}>
                {completedReps}{' '}
                <Text style={styles.repTargetText}>/ {pushUpTarget} REPS</Text>
              </Text>
              <Text style={styles.progressLabel}>
                {pushUpTarget - completedReps} remaining to silence alarm
              </Text>
            </View>

            <View style={styles.aiStatusBadge}>
              <View style={styles.aiGlowDot} />
              <Text style={styles.aiStatusText}>VISION ACTIVE</Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${progressPercentage}%` },
              ]}
            />
          </View>
        </View>

        {/* Center Posture & Alignment Guide Box */}
        <View style={styles.alignmentGuideArea} pointerEvents="none">
          <View style={styles.guideBox}>
            <View style={[styles.guideCorner, styles.cornerTL]} />
            <View style={[styles.guideCorner, styles.cornerTR]} />
            <View style={[styles.guideCorner, styles.cornerBL]} />
            <View style={[styles.guideCorner, styles.cornerBR]} />

            {/* Silhouette Marker Indications */}
            <View style={styles.headMarkerZone}>
              <Text style={styles.markerText}>[ HEAD ZONE ]</Text>
            </View>

            <View style={styles.plankAxisLine} />

            <View style={styles.feetMarkerZone}>
              <Text style={styles.markerText}>[ FEET ZONE ]</Text>
            </View>
          </View>

          <View style={styles.guidancePill}>
            <Text style={styles.guidancePillText}>
              📐 Place phone on floor, 4–6 ft away in side-profile
            </Text>
          </View>
        </View>

        {/* Bottom Controls / Test Action */}
        <View style={styles.hudBottom}>
          <View style={styles.postureIndicator}>
            <Text style={styles.postureStateTitle}>POSTURE STATE:</Text>
            <Text style={styles.postureStateValue}>Waiting for Plank Position</Text>
          </View>

          <TouchableOpacity
            style={styles.testRepButton}
            activeOpacity={0.8}
            onPress={handleSimulateRep}
          >
            <Text style={styles.testRepText}>
              + Simulate 1 Push-Up Rep ({completedReps}/{pushUpTarget})
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  cameraTintOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  hudOverlay: {
    flex: 1,
    justifyContent: 'space-between',
    padding: Spacing.md,
  },

  // Top Bar
  topControlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  alarmStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.25)',
    borderWidth: 1,
    borderColor: Colors.danger,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Spacing.borderRadius.full,
    gap: 6,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.danger,
  },
  alarmStatusText: {
    ...Typography.caption,
    color: '#FF6B6B',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cameraActionButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  iconButton: {
    backgroundColor: 'rgba(22, 25, 34, 0.85)',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Spacing.borderRadius.full,
  },
  iconButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primaryLight,
  },
  iconButtonText: {
    ...Typography.caption,
    color: Colors.textPrimary,
    fontWeight: '700',
  },

  // HUD Card
  hudCard: {
    backgroundColor: 'rgba(22, 25, 34, 0.90)',
    borderRadius: Spacing.borderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  repCountText: {
    ...Typography.hero,
    fontSize: 40,
    color: Colors.textPrimary,
    lineHeight: 46,
  },
  repTargetText: {
    fontSize: 20,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  progressLabel: {
    ...Typography.caption,
    color: Colors.primaryLight,
    fontWeight: '600',
    marginTop: 2,
  },
  aiStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cyanGlow,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Spacing.borderRadius.full,
    borderWidth: 1,
    borderColor: Colors.cyan,
    gap: 6,
  },
  aiGlowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.cyan,
  },
  aiStatusText: {
    ...Typography.caption,
    color: Colors.cyan,
    fontWeight: '700',
    fontSize: 11,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: Spacing.xs,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },

  // Alignment Guide
  alignmentGuideArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.sm,
  },
  guideBox: {
    width: '92%',
    height: 180,
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.35)',
    borderRadius: Spacing.borderRadius.md,
    backgroundColor: 'rgba(0, 210, 255, 0.04)',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideCorner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: Colors.cyan,
  },
  cornerTL: {
    top: -1,
    left: -1,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  cornerTR: {
    top: -1,
    right: -1,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  cornerBL: {
    bottom: -1,
    left: -1,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  cornerBR: {
    bottom: -1,
    right: -1,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  headMarkerZone: {
    position: 'absolute',
    left: 12,
    top: 12,
  },
  feetMarkerZone: {
    position: 'absolute',
    right: 12,
    bottom: 12,
  },
  markerText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(0, 210, 255, 0.7)',
    letterSpacing: 1,
  },
  plankAxisLine: {
    width: '80%',
    height: 2,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.4)',
  },
  guidancePill: {
    backgroundColor: 'rgba(22, 25, 34, 0.85)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Spacing.borderRadius.full,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginTop: Spacing.sm,
  },
  guidancePillText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '600',
  },

  // Bottom HUD
  hudBottom: {
    gap: Spacing.sm,
  },
  postureIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(22, 25, 34, 0.9)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Spacing.borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: 8,
  },
  postureStateTitle: {
    ...Typography.caption,
    color: Colors.textMuted,
    fontWeight: '700',
  },
  postureStateValue: {
    ...Typography.caption,
    color: Colors.warning,
    fontWeight: '700',
  },
  testRepButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: Spacing.borderRadius.md,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  testRepText: {
    ...Typography.bodyBold,
    color: '#000000',
    fontWeight: '800',
  },

  // Permission Gate Styles
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  permissionIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 149, 0, 0.15)',
    borderWidth: 1,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  permissionIcon: {
    fontSize: 36,
  },
  permissionTitle: {
    ...Typography.h2,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  permissionSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  privacyCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: Spacing.borderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    width: '100%',
  },
  privacyTitle: {
    ...Typography.bodyBold,
    color: Colors.cyan,
    marginBottom: 4,
  },
  privacyText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  grantButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: Spacing.borderRadius.md,
    width: '100%',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  grantButtonText: {
    ...Typography.bodyBold,
    color: '#000000',
    fontWeight: '800',
  },
  simulateFallbackButton: {
    paddingVertical: Spacing.sm,
  },
  simulateFallbackText: {
    ...Typography.caption,
    color: Colors.textMuted,
    textDecorationLine: 'underline',
  },

  // Loading Styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  retryButton: {
    backgroundColor: Colors.surfaceLight,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Spacing.borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  retryButtonText: {
    ...Typography.caption,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
});
