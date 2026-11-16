import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { Alarm } from '../../types/alarm';
import { formatTime12h, formatRepeatDays } from '../../utils/timeUtils';
import { Colors, Typography, Spacing } from '../../theme';

interface AlarmCardProps {
  alarm: Alarm;
  onToggle: (isEnabled: boolean) => void;
  onPress: () => void;
  onDelete: () => void;
}

export const AlarmCard: React.FC<AlarmCardProps> = ({
  alarm,
  onToggle,
  onPress,
  onDelete,
}) => {
  const { timeString, period } = formatTime12h(alarm.hour, alarm.minute);
  const repeatText = formatRepeatDays(alarm.repeatDays);

  return (
    <TouchableOpacity
      style={[styles.card, !alarm.isEnabled && styles.cardDisabled]}
      activeOpacity={0.8}
      onPress={onPress}
      onLongPress={onDelete}
    >
      <View style={styles.contentRow}>
        {/* Left: Time & Information */}
        <View style={styles.infoCol}>
          <View style={styles.timeRow}>
            <Text
              style={[
                styles.timeText,
                !alarm.isEnabled && styles.textDisabled,
              ]}
            >
              {timeString}
            </Text>
            <Text
              style={[
                styles.periodText,
                !alarm.isEnabled && styles.periodDisabled,
              ]}
            >
              {period}
            </Text>
          </View>

          <Text style={styles.label}>{alarm.label}</Text>

          <View style={styles.metaRow}>
            <View style={styles.targetBadge}>
              <Text style={styles.targetText}>⚡ {alarm.pushUpTarget} Push-Ups</Text>
            </View>
            <Text style={styles.repeatText}>{repeatText}</Text>
          </View>
        </View>

        {/* Right: Enable/Disable Switch */}
        <View style={styles.actionCol}>
          <Switch
            value={alarm.isEnabled}
            onValueChange={onToggle}
            trackColor={{ false: Colors.surfaceLight, true: Colors.primary }}
            thumbColor={alarm.isEnabled ? '#FFFFFF' : Colors.textMuted}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.borderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  cardDisabled: {
    opacity: 0.6,
  },
  contentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoCol: {
    flex: 1,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  timeText: {
    ...Typography.h1,
    fontSize: 32,
    color: Colors.textPrimary,
  },
  periodText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
    marginLeft: Spacing.xs,
  },
  textDisabled: {
    color: Colors.textSecondary,
  },
  periodDisabled: {
    color: Colors.textMuted,
  },
  label: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: 2,
    marginBottom: Spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  targetBadge: {
    backgroundColor: Colors.primaryGlow,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Spacing.borderRadius.sm,
  },
  targetText: {
    ...Typography.caption,
    color: Colors.primaryLight,
    fontWeight: '700',
    fontSize: 11,
  },
  repeatText: {
    ...Typography.caption,
    color: Colors.textMuted,
    fontSize: 12,
  },
  actionCol: {
    marginLeft: Spacing.md,
  },
});
