import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Weekday } from '../../types/alarm';
import { WEEKDAY_SHORT_NAMES } from '../../utils/timeUtils';
import { Colors, Typography, Spacing } from '../../theme';

interface DaySelectorProps {
  selectedDays: Weekday[];
  onToggleDay: (day: Weekday) => void;
  onSelectPreset: (preset: 'all' | 'weekdays' | 'weekends' | 'none') => void;
}

export const DaySelector: React.FC<DaySelectorProps> = ({
  selectedDays,
  onToggleDay,
  onSelectPreset,
}) => {
  const allDays: Weekday[] = [0, 1, 2, 3, 4, 5, 6];

  return (
    <View style={styles.container}>
      <Text style={styles.label}>REPEAT SCHEDULE</Text>

      {/* Weekday Circle Buttons */}
      <View style={styles.daysRow}>
        {allDays.map((day) => {
          const isSelected = selectedDays.includes(day);
          return (
            <TouchableOpacity
              key={day}
              style={[styles.dayButton, isSelected && styles.dayButtonActive]}
              activeOpacity={0.7}
              onPress={() => onToggleDay(day)}
            >
              <Text style={[styles.dayText, isSelected && styles.dayTextActive]}>
                {WEEKDAY_SHORT_NAMES[day].substring(0, 1)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Quick Presets */}
      <View style={styles.presetsRow}>
        <TouchableOpacity
          style={styles.presetChip}
          onPress={() => onSelectPreset('weekdays')}
        >
          <Text style={styles.presetText}>Weekdays</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.presetChip}
          onPress={() => onSelectPreset('weekends')}
        >
          <Text style={styles.presetText}>Weekends</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.presetChip}
          onPress={() => onSelectPreset('all')}
        >
          <Text style={styles.presetText}>Every day</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.presetChip}
          onPress={() => onSelectPreset('none')}
        >
          <Text style={styles.presetText}>Once</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.borderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginTop: Spacing.md,
  },
  label: {
    ...Typography.caption,
    color: Colors.primary,
    letterSpacing: 1.5,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  dayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dayText: {
    ...Typography.bodyBold,
    color: Colors.textSecondary,
    fontSize: 14,
  },
  dayTextActive: {
    color: '#000000',
  },
  presetsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  presetChip: {
    flex: 1,
    paddingVertical: Spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: Spacing.borderRadius.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  presetText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontSize: 11,
  },
});
