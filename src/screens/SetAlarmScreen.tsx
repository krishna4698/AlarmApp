import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing } from '../theme';
import { SetAlarmScreenProps } from '../types/navigation';
import { Weekday } from '../types/alarm';
import { TimePickerWheel } from '../components/alarm/TimePickerWheel';
import { DaySelector } from '../components/alarm/DaySelector';
import { AlarmStorageService } from '../services/alarmStorage';
import { NativeAlarmService } from '../services/nativeAlarmService';

export const SetAlarmScreen: React.FC<SetAlarmScreenProps> = ({ route, navigation }) => {
  const alarmId = route.params?.alarmId;
  const isEditing = Boolean(alarmId);

  const [hour, setHour] = useState(6);
  const [minute, setMinute] = useState(30);
  const [label, setLabel] = useState('Morning Push-ups');
  const [repeatDays, setRepeatDays] = useState<Weekday[]>([1, 2, 3, 4, 5]); // Mon - Fri
  const [pushUpTarget, setPushUpTarget] = useState(20);
  const [loading, setLoading] = useState(true);

  // Load existing alarm if in edit mode
  useEffect(() => {
    async function loadExisting() {
      if (alarmId) {
        const existing = await AlarmStorageService.getAlarmById(alarmId);
        if (existing) {
          setHour(existing.hour);
          setMinute(existing.minute);
          setLabel(existing.label);
          setRepeatDays(existing.repeatDays);
          setPushUpTarget(existing.pushUpTarget);
        }
      }
      setLoading(false);
    }
    loadExisting();
  }, [alarmId]);

  const handleToggleDay = (day: Weekday) => {
    if (repeatDays.includes(day)) {
      setRepeatDays(repeatDays.filter((d) => d !== day));
    } else {
      setRepeatDays([...repeatDays, day]);
    }
  };

  const handlePresetDays = (preset: 'all' | 'weekdays' | 'weekends' | 'none') => {
    switch (preset) {
      case 'all':
        setRepeatDays([0, 1, 2, 3, 4, 5, 6]);
        break;
      case 'weekdays':
        setRepeatDays([1, 2, 3, 4, 5]);
        break;
      case 'weekends':
        setRepeatDays([0, 6]);
        break;
      case 'none':
        setRepeatDays([]);
        break;
    }
  };

  const handleSave = async () => {
    if (pushUpTarget < 5) {
      Alert.alert('Invalid Target', 'Please require at least 5 push-ups to wake up.');
      return;
    }

    const saved = await AlarmStorageService.saveAlarm({
      id: alarmId,
      hour,
      minute,
      label: label.trim() || 'Push-Up Alarm',
      isEnabled: true,
      repeatDays,
      pushUpTarget,
    });

    // Schedule native exact alarm with Android AlarmManager & ForegroundService
    await NativeAlarmService.scheduleAlarm(saved);

    navigation.goBack();
  };

  const handleDelete = () => {
    if (!alarmId) return;

    Alert.alert('Delete Alarm', 'Are you sure you want to delete this alarm?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await NativeAlarmService.cancelAlarm(alarmId);
          await AlarmStorageService.deleteAlarm(alarmId);
          navigation.goBack();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading alarm configuration...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} nestedScrollEnabled={true}>
        {/* Header Bar */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isEditing ? 'Edit Alarm' : 'Set Alarm'}</Text>
          <TouchableOpacity onPress={handleSave} style={styles.headerButton}>
            <Text style={styles.saveText}>Save</Text>
          </TouchableOpacity>
        </View>

        {/* Time Picker */}
        <TimePickerWheel
          hour={hour}
          minute={minute}
          onChangeTime={(newH, newM) => {
            setHour(newH);
            setMinute(newM);
          }}
        />

        {/* Day Selector */}
        <DaySelector
          selectedDays={repeatDays}
          onToggleDay={handleToggleDay}
          onSelectPreset={handlePresetDays}
        />

        {/* Push-Up Repetition Target */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>REQUIRED PUSH-UPS TO DISMISS</Text>
          <View style={styles.repsRow}>
            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => setPushUpTarget(Math.max(5, pushUpTarget - 5))}
            >
              <Text style={styles.stepBtnText}>- 5</Text>
            </TouchableOpacity>

            <View style={styles.repsCenter}>
              <Text style={styles.repsNumber}>{pushUpTarget}</Text>
              <Text style={styles.repsUnit}>REPS</Text>
            </View>

            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => setPushUpTarget(Math.min(100, pushUpTarget + 5))}
            >
              <Text style={styles.stepBtnText}>+ 5</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Preset Buttons */}
          <View style={styles.targetPresets}>
            {[10, 15, 20, 25, 30, 40].map((preset) => (
              <TouchableOpacity
                key={preset}
                style={[
                  styles.presetPill,
                  pushUpTarget === preset && styles.presetPillActive,
                ]}
                onPress={() => setPushUpTarget(preset)}
              >
                <Text
                  style={[
                    styles.presetPillText,
                    pushUpTarget === preset && styles.presetPillTextActive,
                  ]}
                >
                  {preset}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Alarm Label */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>ALARM LABEL</Text>
          <TextInput
            style={styles.input}
            value={label}
            onChangeText={setLabel}
            placeholder="e.g. Morning Workout"
            placeholderTextColor={Colors.textMuted}
            maxLength={30}
          />
        </View>

        {/* Delete Button (If editing) */}
        {isEditing && (
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Text style={styles.deleteText}>Delete Alarm</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    marginBottom: Spacing.sm,
  },
  headerButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    ...Typography.h2,
    color: Colors.textPrimary,
  },
  cancelText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  saveText: {
    ...Typography.bodyBold,
    color: Colors.primary,
    fontSize: 16,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.borderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  cardLabel: {
    ...Typography.caption,
    color: Colors.primary,
    letterSpacing: 1.5,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  repsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepBtn: {
    backgroundColor: Colors.surfaceLight,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Spacing.borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  stepBtnText: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
  },
  repsCenter: {
    alignItems: 'center',
  },
  repsNumber: {
    ...Typography.hero,
    fontSize: 52,
    color: Colors.primary,
  },
  repsUnit: {
    ...Typography.caption,
    color: Colors.textSecondary,
    letterSpacing: 2,
  },
  targetPresets: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  presetPill: {
    flex: 1,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.surfaceLight,
    borderRadius: Spacing.borderRadius.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  presetPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  presetPillText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  presetPillTextActive: {
    color: '#000000',
  },
  input: {
    backgroundColor: Colors.surfaceLight,
    color: Colors.textPrimary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Spacing.borderRadius.md,
    ...Typography.body,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  deleteButton: {
    marginTop: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Spacing.borderRadius.md,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
    borderWidth: 1,
    borderColor: Colors.dangerGlow,
  },
  deleteText: {
    ...Typography.bodyBold,
    color: Colors.danger,
  },
});
