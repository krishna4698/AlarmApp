import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Typography, Spacing } from '../../theme';

interface TimePickerWheelProps {
  hour: number;   // 0 - 23
  minute: number; // 0 - 59
  onChangeTime: (newHour: number, newMinute: number) => void;
}

export const TimePickerWheel: React.FC<TimePickerWheelProps> = ({
  hour,
  minute,
  onChangeTime,
}) => {
  const isPM = hour >= 12;
  let hour12 = hour % 12;
  if (hour12 === 0) hour12 = 12;

  const handleHourStep = (delta: number) => {
    let nextH12 = hour12 + delta;
    if (nextH12 > 12) nextH12 = 1;
    if (nextH12 < 1) nextH12 = 12;

    let new24H = nextH12;
    if (isPM && nextH12 < 12) new24H += 12;
    if (!isPM && nextH12 === 12) new24H = 0;

    onChangeTime(new24H, minute);
  };

  const handleMinuteStep = (delta: number) => {
    let nextM = minute + delta;
    if (nextM >= 60) nextM = 0;
    if (nextM < 0) nextM = 55;
    onChangeTime(hour, nextM);
  };

  const togglePeriod = (targetPM: boolean) => {
    if (targetPM === isPM) return;
    const new24H = targetPM ? (hour % 12) + 12 : hour % 12;
    onChangeTime(new24H, minute);
  };

  const formattedHour = hour12 < 10 ? `0${hour12}` : `${hour12}`;
  const formattedMinute = minute < 10 ? `0${minute}` : `${minute}`;

  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>ALARM TIME</Text>

      <View style={styles.pickerRow}>
        {/* Hour Column */}
        <View style={styles.column}>
          <TouchableOpacity
            style={styles.stepButton}
            onPress={() => handleHourStep(1)}
          >
            <Text style={styles.stepIcon}>▲</Text>
          </TouchableOpacity>

          <View style={styles.numberBox}>
            <Text style={styles.numberText}>{formattedHour}</Text>
            <Text style={styles.unitLabel}>HOUR</Text>
          </View>

          <TouchableOpacity
            style={styles.stepButton}
            onPress={() => handleHourStep(-1)}
          >
            <Text style={styles.stepIcon}>▼</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.colon}>:</Text>

        {/* Minute Column */}
        <View style={styles.column}>
          <TouchableOpacity
            style={styles.stepButton}
            onPress={() => handleMinuteStep(5)}
          >
            <Text style={styles.stepIcon}>▲</Text>
          </TouchableOpacity>

          <View style={styles.numberBox}>
            <Text style={styles.numberText}>{formattedMinute}</Text>
            <Text style={styles.unitLabel}>MIN</Text>
          </View>

          <TouchableOpacity
            style={styles.stepButton}
            onPress={() => handleMinuteStep(-5)}
          >
            <Text style={styles.stepIcon}>▼</Text>
          </TouchableOpacity>
        </View>

        {/* AM / PM Toggle */}
        <View style={styles.periodColumn}>
          <TouchableOpacity
            style={[styles.periodButton, !isPM && styles.periodButtonActive]}
            onPress={() => togglePeriod(false)}
          >
            <Text style={[styles.periodText, !isPM && styles.periodTextActive]}>
              AM
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.periodButton, isPM && styles.periodButtonActive]}
            onPress={() => togglePeriod(true)}
          >
            <Text style={[styles.periodText, isPM && styles.periodTextActive]}>
              PM
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.borderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
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
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  column: {
    alignItems: 'center',
  },
  stepButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  stepIcon: {
    fontSize: 16,
    color: Colors.primaryLight,
  },
  numberBox: {
    backgroundColor: Colors.surfaceLight,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Spacing.borderRadius.md,
    minWidth: 80,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  numberText: {
    ...Typography.hero,
    fontSize: 48,
    color: Colors.textPrimary,
  },
  unitLabel: {
    ...Typography.caption,
    color: Colors.textMuted,
    fontSize: 10,
    letterSpacing: 1,
  },
  colon: {
    ...Typography.hero,
    fontSize: 40,
    color: Colors.primary,
    marginTop: -Spacing.sm,
  },
  periodColumn: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: Spacing.borderRadius.md,
    padding: 3,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: 4,
    marginLeft: Spacing.xs,
  },
  periodButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Spacing.borderRadius.sm,
  },
  periodButtonActive: {
    backgroundColor: Colors.primary,
  },
  periodText: {
    ...Typography.bodyBold,
    color: Colors.textSecondary,
    fontSize: 13,
  },
  periodTextActive: {
    color: '#000000',
  },
});
