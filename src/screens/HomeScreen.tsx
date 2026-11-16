import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Typography, Spacing } from '../theme';
import { HomeScreenProps } from '../types/navigation';
import { Alarm } from '../types/alarm';
import { AlarmStorageService } from '../services/alarmStorage';
import { NativeAlarmService } from '../services/nativeAlarmService';
import { AlarmCard } from '../components/alarm/AlarmCard';
import {
  formatTime12h,
  formatRepeatDays,
  getTimeUntilString,
} from '../utils/timeUtils';

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [upcoming, setUpcoming] = useState<{
    alarm: Alarm;
    nextTriggerDate: Date;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  // Refresh alarms whenever this screen gains focus
  const loadAlarms = useCallback(async () => {
    const list = await AlarmStorageService.getAlarms();
    setAlarms(list);
    const next = AlarmStorageService.getNextUpcomingAlarm(list);
    setUpcoming(next);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAlarms();
    }, [loadAlarms])
  );

  const handleToggleAlarm = async (alarm: Alarm, isEnabled: boolean) => {
    const updated = await AlarmStorageService.toggleAlarm(alarm.id, isEnabled);
    if (updated) {
      if (isEnabled) {
        await NativeAlarmService.scheduleAlarm(updated);
      } else {
        await NativeAlarmService.cancelAlarm(updated.id);
      }
    }
    await loadAlarms();
  };

  const handleDeleteAlarm = (alarm: Alarm) => {
    Alert.alert(
      'Delete Alarm',
      `Delete "${alarm.label || 'Alarm'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await NativeAlarmService.cancelAlarm(alarm.id);
            await AlarmStorageService.deleteAlarm(alarm.id);
            await loadAlarms();
          },
        },
      ]
    );
  };

  const handleTestLiveAlarm = async () => {
    const targetReps = upcoming?.alarm?.pushUpTarget || 10;
    const triggerDate = await NativeAlarmService.scheduleQuickTestAlarm(
      targetReps,
      'Live Test Push-Up Alarm'
    );

    Alert.alert(
      '⏰ Live Alarm Scheduled!',
      `Alarm will fire at ${triggerDate.toLocaleTimeString()} (in 10 seconds).\n\nYou can lock your phone right now or minimize the app to verify the screen turns on and the alarm rings!`,
      [{ text: 'Got it!' }]
    );
  };

  const renderUpcomingHero = () => {
    if (!upcoming) {
      return (
        <View style={styles.noUpcomingHero}>
          <Text style={styles.noUpcomingBadge}>NO ALARMS ACTIVE</Text>
          <Text style={styles.noUpcomingTitle}>All alarms are paused</Text>
          <Text style={styles.noUpcomingSub}>
            Enable an existing alarm below or tap "+" to create a new challenge.
          </Text>
        </View>
      );
    }

    const { timeString, period } = formatTime12h(
      upcoming.alarm.hour,
      upcoming.alarm.minute
    );
    const countdown = getTimeUntilString(upcoming.nextTriggerDate);
    const repeatText = formatRepeatDays(upcoming.alarm.repeatDays);

    return (
      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroBadgeBox}>
            <Text style={styles.heroBadge}>NEXT UPCOMING ALARM</Text>
          </View>
          <Text style={styles.heroCountdown}>{countdown}</Text>
        </View>

        <View style={styles.heroTimeRow}>
          <Text style={styles.heroTimeText}>{timeString}</Text>
          <Text style={styles.heroPeriod}>{period}</Text>
        </View>

        <View style={styles.heroDivider} />

        <View style={styles.heroBottomRow}>
          <View style={styles.heroTargetBadge}>
            <Text style={styles.heroTargetText}>
              ⚡ {upcoming.alarm.pushUpTarget} Push-Ups Required
            </Text>
          </View>
          <Text style={styles.heroDays}>{repeatText}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerSubtitle}>WAKE UP & WORK OUT</Text>
            <Text style={styles.headerTitle}>Push-Up Alarm</Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('SetAlarm', undefined)}
          >
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Scrollable Alarm List */}
        <FlatList
          data={alarms}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <View>
              {renderUpcomingHero()}
              <View style={styles.listSectionHeader}>
                <Text style={styles.listSectionTitle}>YOUR ALARMS</Text>
                <Text style={styles.listSectionCount}>{alarms.length} Total</Text>
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <AlarmCard
              alarm={item}
              onToggle={(val) => handleToggleAlarm(item, val)}
              onPress={() => navigation.navigate('SetAlarm', { alarmId: item.id })}
              onDelete={() => handleDeleteAlarm(item)}
            />
          )}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>No alarms yet</Text>
                <Text style={styles.emptySub}>
                  Tap the "+" button above to schedule your first push-up alarm.
                </Text>
              </View>
            ) : null
          }
          contentContainerStyle={styles.listContent}
        />

        {/* Floating Bottom Bar: Live Trigger & Screen Simulation */}
        <View style={styles.simBar}>
          <TouchableOpacity
            style={styles.cameraTestButton}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('PushUpChallenge', {
              alarmId: 'camera-test',
              pushUpTarget: 10,
            })}
          >
            <Text style={styles.cameraTestButtonText}>
              📷 Test Push-Up Camera & HUD
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.liveAlarmButton}
            activeOpacity={0.85}
            onPress={handleTestLiveAlarm}
          >
            <Text style={styles.liveAlarmButtonText}>
              ⚡ Fire Live Alarm in 10s (Test Audio + Screen)
            </Text>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  headerSubtitle: {
    ...Typography.caption,
    color: Colors.primary,
    letterSpacing: 2,
    fontWeight: '700',
  },
  headerTitle: {
    ...Typography.h1,
    color: Colors.textPrimary,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonText: {
    fontSize: 28,
    color: '#000000',
    fontWeight: '600',
    marginTop: -2,
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 90,
  },
  heroCard: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.borderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroBadgeBox: {
    backgroundColor: Colors.cyanGlow,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Spacing.borderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.cyan,
  },
  heroBadge: {
    ...Typography.caption,
    color: Colors.cyan,
    fontWeight: '800',
    fontSize: 10,
    letterSpacing: 1,
  },
  heroCountdown: {
    ...Typography.caption,
    color: Colors.primaryLight,
    fontWeight: '700',
  },
  heroTimeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: Spacing.sm,
  },
  heroTimeText: {
    ...Typography.hero,
    fontSize: 54,
    color: Colors.textPrimary,
  },
  heroPeriod: {
    fontSize: 22,
    color: Colors.primary,
    fontWeight: '700',
    marginLeft: Spacing.xs,
  },
  heroDivider: {
    height: 1,
    backgroundColor: Colors.surfaceBorder,
    marginVertical: Spacing.md,
  },
  heroBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  heroTargetBadge: {
    backgroundColor: Colors.primaryGlow,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Spacing.borderRadius.sm,
  },
  heroTargetText: {
    ...Typography.caption,
    color: Colors.primaryLight,
    fontWeight: '800',
  },
  heroDays: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  noUpcomingHero: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.borderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
    alignItems: 'center',
  },
  noUpcomingBadge: {
    ...Typography.caption,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  noUpcomingTitle: {
    ...Typography.h3,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  noUpcomingSub: {
    ...Typography.caption,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  listSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    paddingHorizontal: 2,
  },
  listSectionTitle: {
    ...Typography.caption,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  listSectionCount: {
    ...Typography.caption,
    color: Colors.textMuted,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyTitle: {
    ...Typography.h3,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  emptySub: {
    ...Typography.body,
    color: Colors.textMuted,
    textAlign: 'center',
    fontSize: 13,
  },
  simBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.md,
    gap: Spacing.xs,
    backgroundColor: 'rgba(13, 15, 20, 0.95)',
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
  },
  cameraTestButton: {
    backgroundColor: Colors.surfaceLight,
    paddingVertical: Spacing.sm,
    borderRadius: Spacing.borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cyan,
  },
  cameraTestButtonText: {
    ...Typography.bodyBold,
    color: Colors.cyan,
    fontSize: 13,
  },
  liveAlarmButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm,
    borderRadius: Spacing.borderRadius.md,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  liveAlarmButtonText: {
    ...Typography.bodyBold,
    color: '#000000',
    fontSize: 13,
  },
});
