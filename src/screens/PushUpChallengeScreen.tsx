import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCameraPermission } from 'react-native-vision-camera';
import { Colors, Typography, Spacing } from '../theme';
import { PushUpChallengeScreenProps } from '../types/navigation';
import { NativeAlarmService } from '../services/nativeAlarmService';
import { VolumeLockService } from '../services/volumeLockService';
import {
  PoseCamera,
  PoseAnalysisEventData,
} from '../components/camera/PoseCameraView';

type PoseState = PoseAnalysisEventData['state'];

interface PostureDisplayInfo {
  title: string;
  desc: string;
  color: string;
  border: string;
  bg: string;
}

const getPostureDisplay = (
  poseState: PoseState,
  depthPercentage: number
): PostureDisplayInfo => {
  switch (poseState) {
    case 'NO_FACE':
      return {
        title: 'LOOK AT SCREEN',
        desc: 'Place phone on floor in front of you & look down',
        color: Colors.textMuted,
        border: Colors.surfaceBorder,
        bg: 'rgba(22, 25, 34, 0.85)',
      };
    case 'DEVICE_MOVING':
      return {
        title: 'PHONE MOVING 📱',
        desc: 'Place phone completely still on the floor!',
        color: Colors.danger,
        border: Colors.danger,
        bg: 'rgba(255, 59, 48, 0.25)',
      };
    case 'NEED_SHOULDERS':
      return {
        title: 'SHOW BOTH SHOULDERS',
        desc: 'Step back into plank so chest & both shoulders are visible',
        color: Colors.warning,
        border: Colors.warning,
        bg: 'rgba(255, 214, 10, 0.15)',
      };
    case 'READY_AT_TOP':
      return {
        title: 'LOCKED AT TOP! GO DOWN',
        desc: 'Lower chest down towards phone (reach 100%)',
        color: Colors.success,
        border: Colors.success,
        bg: 'rgba(52, 199, 89, 0.15)',
      };
    case 'DESCENDING':
      return {
        title: `LOWERING... (${depthPercentage}%)`,
        desc: 'Bring chest closer to the floor (reach 100%)',
        color: '#FF9500',
        border: '#FF9500',
        bg: 'rgba(255, 149, 0, 0.15)',
      };
    case 'BOTTOM_REACHED':
      return {
        title: 'FULL DEPTH (100%)! PUSH UP!',
        desc: 'Chest reached bottom! Lock out arms to score rep',
        color: '#00D2FF',
        border: '#00D2FF',
        bg: 'rgba(0, 210, 255, 0.20)',
      };
    case 'ASCENDING':
      return {
        title: 'PUSHING UP...',
        desc: 'Extend arms fully back to top lockout',
        color: '#AF52DE',
        border: '#AF52DE',
        bg: 'rgba(175, 82, 222, 0.15)',
      };
    default:
      return {
        title: 'FRONT VISION ACTIVE',
        desc: 'Face & chest alignment active',
        color: Colors.primary,
        border: Colors.primary,
        bg: 'rgba(255, 149, 0, 0.15)',
      };
  }
};

const getWarningMessage = (
  isDeviceStationary: boolean,
  poseState: PoseState,
  isFormValid: boolean
): string | null => {
  if (!isDeviceStationary) {
    return '⚠️ PHONE MOVING: Place phone still on the floor!';
  }
  if (poseState === 'NEED_SHOULDERS') {
    return '⚠️ Step back: Chest & both shoulders must be in frame!';
  }
  if (!isFormValid && poseState !== 'NO_FACE') {
    return "⚠️ Drop your shoulders with your head! Don't just bob neck.";
  }
  return null;
};

export const PushUpChallengeScreen: React.FC<PushUpChallengeScreenProps> = ({
  route,
  navigation,
}) => {
  const { pushUpTarget = 20, alarmId } = route.params || {};
  const [completedReps, setCompletedReps] = useState(0);

  // Camera Settings
  const { hasPermission, requestPermission } = useCameraPermission();
  const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('front');
  const [torchEnabled, setTorchEnabled] = useState(false);

  // Real-time Front-Facing AI Push-Up State
  const [poseState, setPoseState] =
    useState<PoseAnalysisEventData['state']>('NO_FACE');
  const [depthScale, setDepthScale] = useState(1.0);
  const [depthPercentage, setDepthPercentage] = useState(0);
  const [isEyesDetected, setIsEyesDetected] = useState(false);
  const [isFormValid, setIsFormValid] = useState(true);
  const [isDeviceStationary, setIsDeviceStationary] = useState(true);
  const [lastCountedTime, setLastCountedTime] = useState(0);

  // Guard against double success triggers
  const isFinishedRef = useRef(false);

  // Keep dedicated un-mutable alarm sound playing & volume buttons locked
  useEffect(() => {
    if (alarmId && alarmId !== 'camera-test') {
      VolumeLockService.startAlarmSound();
    }
  }, [alarmId]);

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
    setCameraFacing((prev) => (prev === 'front' ? 'back' : 'front'));
    setTorchEnabled(false);
  };

  const toggleTorch = () => {
    if (cameraFacing === 'back') {
      setTorchEnabled((prev) => !prev);
    }
  };

  // Completion Handler
  const handleChallengeSuccess = async (finalReps: number) => {
    if (isFinishedRef.current) return;
    isFinishedRef.current = true;

    // 1. Release volume lock and silence alarm MediaPlayer
    VolumeLockService.stopAlarmSound();
    await NativeAlarmService.stopAlarm(alarmId || 'quick-test');

    navigation.replace('ChallengeCompleted', {
      alarmId: alarmId || 'demo',
      completedReps: finalReps,
    });
  };

  // AI Event Listener from native ML Kit engine
  const handlePoseAnalysis = (data: PoseAnalysisEventData) => {
    setPoseState(data.state);
    setDepthScale(data.depthScale);
    setDepthPercentage(data.depthPercentage);
    setIsEyesDetected(data.isEyesDetected);
    setIsFormValid(data.isFormValid);
    setIsDeviceStationary(data.isDeviceStationary);

    if (data.repJustCounted) {
      setLastCountedTime(Date.now());
    }

    if (data.reps > completedReps) {
      setCompletedReps(data.reps);
      if (data.reps >= pushUpTarget) {
        handleChallengeSuccess(data.reps);
      }
    }
  };

  // Manual / Test Rep Simulation (kept for verification & fallback)
  const handleSimulateRep = () => {
    const nextReps = completedReps + 1;
    setCompletedReps(nextReps);

    if (nextReps >= pushUpTarget) {
      handleChallengeSuccess(nextReps);
    }
  };

  const postureInfo = getPostureDisplay(poseState, depthPercentage);
  const warningMessage = getWarningMessage(isDeviceStationary, poseState, isFormValid);
  const isRepFlashActive = Date.now() - lastCountedTime < 800;

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
            To verify your push-ups and turn off the alarm, the app needs live
            camera vision.
          </Text>

          <View style={styles.privacyCard}>
            <Text style={styles.privacyTitle}>🔒 100% On-Device Privacy</Text>
            <Text style={styles.privacyText}>
              All pose estimation runs locally in real-time via bundled Google ML
              Kit. No pictures or video feeds are ever recorded, stored, or sent
              to any server.
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

  // 2. Live Camera View with Real-time AI HUD
  return (
    <View style={styles.fullScreenContainer}>
      {/* Background Native ML Kit Camera Stream */}
      <PoseCamera
        style={StyleSheet.absoluteFill}
        cameraFacing={cameraFacing}
        torch={torchEnabled}
        targetReps={pushUpTarget}
        onPoseAnalysis={handlePoseAnalysis}
      />

      {/* Rep Success Flash Overlay */}
      {isRepFlashActive && (
        <View style={styles.repFlashOverlay} pointerEvents="none" />
      )}

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
            {cameraFacing === 'back' && (
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
                {cameraFacing === 'front' ? '🔄 Front' : '🔄 Back'}
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

            <View
              style={[
                styles.aiStatusBadge,
                {
                  borderColor: postureInfo.border,
                  backgroundColor: postureInfo.bg,
                },
              ]}
            >
              <View
                style={[
                  styles.aiGlowDot,
                  { backgroundColor: postureInfo.color },
                ]}
              />
              <Text style={[styles.aiStatusText, { color: postureInfo.color }]}>
                {postureInfo.title}
              </Text>
            </View>
          </View>

          {/* Progress Bar (Overall reps to silence alarm) */}
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${progressPercentage}%` },
              ]}
            />
          </View>

          {/* Real-Time Front-Facing Telemetry */}
          <View style={styles.telemetryRow}>
            <View style={styles.telemetryItem}>
              <Text style={styles.telemetryLabel}>CHEST DEPTH</Text>
              <Text
                style={[
                  styles.telemetryValue,
                  depthPercentage >= 90
                    ? { color: '#00D2FF' }
                    : depthPercentage > 0
                    ? { color: '#FF9500' }
                    : { color: Colors.textPrimary },
                ]}
              >
                {depthPercentage}%
              </Text>
            </View>

            <View style={styles.telemetryDivider} />

            <View style={styles.telemetryItem}>
              <Text style={styles.telemetryLabel}>FACE SCALE</Text>
              <Text style={styles.telemetryValue}>{depthScale}x</Text>
            </View>

            <View style={styles.telemetryDivider} />

            <View style={styles.telemetryItem}>
              <Text style={styles.telemetryLabel}>EYES / FACE</Text>
              <Text
                style={[
                  styles.telemetryValue,
                  isEyesDetected
                    ? { color: Colors.success }
                    : { color: Colors.danger },
                ]}
              >
                {isEyesDetected ? 'LOCKED 👁️' : 'OFF SCREEN'}
              </Text>
            </View>
          </View>
        </View>

        {/* Center Face & Chest Targeting Reticle */}
        <View style={styles.alignmentGuideArea} pointerEvents="none">
          <View
            style={[
              styles.targetCircle,
              {
                borderColor: postureInfo.border,
                transform: [
                  { scale: 1.0 + (depthPercentage / 100) * 0.15 },
                ],
              },
            ]}
          >
            <View
              style={[
                styles.innerTargetPulse,
                {
                  borderColor: postureInfo.border,
                  backgroundColor: postureInfo.bg,
                },
              ]}
            >
              <Text style={styles.targetIcon}>
                {poseState === 'BOTTOM_REACHED'
                  ? '⚡'
                  : isEyesDetected
                  ? '👁️'
                  : '👤'}
              </Text>
              <Text style={[styles.targetLabel, { color: postureInfo.color }]}>
                {depthPercentage > 0 ? `${depthPercentage}% DEPTH` : 'TARGET ZONE'}
              </Text>
            </View>
          </View>

          {/* Form Warning or Placement Guidance */}
          {warningMessage ? (
            <View style={styles.warningPill}>
              <Text style={styles.warningPillText}>{warningMessage}</Text>
            </View>
          ) : (
            <View style={styles.guidancePill}>
              <Text style={styles.guidancePillText}>
                📐 {postureInfo.desc}
              </Text>
            </View>
          )}
        </View>

        {/* Bottom HUD Controls */}
        <View style={styles.hudBottom}>
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
    backgroundColor: 'rgba(0, 0, 0, 0.20)',
  },
  repFlashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(52, 199, 89, 0.25)',
    zIndex: 10,
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
    backgroundColor: 'rgba(22, 25, 34, 0.92)',
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
    marginBottom: Spacing.xs,
  },
  repCountText: {
    ...Typography.hero,
    fontSize: 38,
    color: Colors.textPrimary,
    lineHeight: 44,
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
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Spacing.borderRadius.full,
    borderWidth: 1,
    gap: 6,
  },
  aiGlowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  aiStatusText: {
    ...Typography.caption,
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

  // Telemetry Row
  telemetryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  telemetryItem: {
    alignItems: 'center',
  },
  telemetryLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  telemetryValue: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
    color: Colors.textPrimary,
  },
  telemetryDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },

  // Center Target Reticle
  alignmentGuideArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.sm,
  },
  targetCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerTargetPulse: {
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  targetIcon: {
    fontSize: 40,
  },
  targetLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  guidancePill: {
    backgroundColor: 'rgba(22, 25, 34, 0.85)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Spacing.borderRadius.full,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginTop: Spacing.md,
  },
  guidancePillText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  warningPill: {
    backgroundColor: 'rgba(255, 59, 48, 0.25)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Spacing.borderRadius.full,
    borderWidth: 1,
    borderColor: Colors.danger,
    marginTop: Spacing.md,
  },
  warningPillText: {
    ...Typography.caption,
    color: '#FF6B6B',
    fontWeight: '700',
  },

  // Bottom HUD
  hudBottom: {
    gap: Spacing.sm,
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
});
