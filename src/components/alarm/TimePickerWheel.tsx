import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Colors, Typography, Spacing } from '../../theme';

interface TimePickerWheelProps {
  hour: number;   // 0 - 23
  minute: number; // 0 - 59
  onChangeTime: (newHour: number, newMinute: number) => void;
}

const ITEM_HEIGHT = 48;
const VISIBLE_COUNT = 3;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_COUNT;

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1); // 1..12
const MINUTES = Array.from({ length: 60 }, (_, i) => i);   // 0..59
const PERIODS: ('AM' | 'PM')[] = ['AM', 'PM'];

interface WheelColumnProps<T> {
  data: T[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  formatItem: (item: T) => string;
  label: string;
  width?: number;
}

function WheelColumn<T>({
  data,
  selectedIndex,
  onSelect,
  formatItem,
  label,
  width = 72,
}: WheelColumnProps<T>) {
  const scrollRef = useRef<ScrollView>(null);
  const isUserScrolling = useRef(false);

  // Sync scroll position whenever selectedIndex changes externally
  useEffect(() => {
    if (!isUserScrolling.current && scrollRef.current) {
      scrollRef.current.scrollTo({
        y: selectedIndex * ITEM_HEIGHT,
        animated: true,
      });
    }
  }, [selectedIndex]);

  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = e.nativeEvent.contentOffset.y;
    const index = Math.max(0, Math.min(data.length - 1, Math.round(offsetY / ITEM_HEIGHT)));
    isUserScrolling.current = false;
    if (index !== selectedIndex) {
      onSelect(index);
    }
  };

  const handleItemPress = (index: number) => {
    scrollRef.current?.scrollTo({
      y: index * ITEM_HEIGHT,
      animated: true,
    });
    onSelect(index);
  };

  return (
    <View style={[styles.columnWrapper, { width }]}>
      <Text style={styles.wheelHeaderLabel}>{label}</Text>
      <View style={styles.wheelContainer}>
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          bounces={false}
          nestedScrollEnabled={true}
          contentContainerStyle={{
            paddingVertical: ITEM_HEIGHT, // Leaves space so 1st and last items center
          }}
          onScrollBeginDrag={() => {
            isUserScrolling.current = true;
          }}
          onMomentumScrollEnd={handleScrollEnd}
          onScrollEndDrag={(e) => {
            setTimeout(() => {
              if (isUserScrolling.current) {
                handleScrollEnd(e);
              }
            }, 100);
          }}
        >
          {data.map((item, index) => {
            const isSelected = index === selectedIndex;
            return (
              <TouchableOpacity
                key={`${label}-${index}`}
                activeOpacity={0.7}
                style={[styles.itemBox, isSelected && styles.itemBoxSelected]}
                onPress={() => handleItemPress(index)}
              >
                <Text
                  style={[
                    styles.itemText,
                    isSelected ? styles.itemTextSelected : styles.itemTextMuted,
                  ]}
                >
                  {formatItem(item)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

export const TimePickerWheel: React.FC<TimePickerWheelProps> = ({
  hour,
  minute,
  onChangeTime,
}) => {
  const isPM = hour >= 12;
  let hour12 = hour % 12;
  if (hour12 === 0) hour12 = 12;

  const hourIndex = hour12 - 1;
  const minuteIndex = minute;
  const periodIndex = isPM ? 1 : 0;

  const handleHourSelect = (newHIndex: number) => {
    const selectedH12 = HOURS[newHIndex];
    let new24H = selectedH12;
    if (isPM && selectedH12 < 12) new24H += 12;
    if (!isPM && selectedH12 === 12) new24H = 0;
    onChangeTime(new24H, minute);
  };

  const handleMinuteSelect = (newMIndex: number) => {
    onChangeTime(hour, MINUTES[newMIndex]);
  };

  const handlePeriodSelect = (newPIndex: number) => {
    const targetPM = newPIndex === 1;
    if (targetPM === isPM) return;
    const new24H = targetPM ? (hour % 12) + 12 : hour % 12;
    onChangeTime(new24H, minute);
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardLabel}>SCROLL TO SET TIME</Text>
        <Text style={styles.previewTimeText}>
          {hour12 < 10 ? `0${hour12}` : hour12}:{minute < 10 ? `0${minute}` : minute}{' '}
          <Text style={styles.previewPeriodText}>{isPM ? 'PM' : 'AM'}</Text>
        </Text>
      </View>

      <View style={styles.pickerContainer}>
        {/* Center Selection Indicator Banner */}
        <View style={styles.centerSelectionBanner} pointerEvents="none" />

        {/* Scrollable Hour Wheel */}
        <WheelColumn
          label="HOUR"
          data={HOURS}
          selectedIndex={hourIndex}
          onSelect={handleHourSelect}
          formatItem={(h) => (h < 10 ? `0${h}` : `${h}`)}
          width={76}
        />

        {/* Separator Colon */}
        <View style={styles.colonContainer}>
          <Text style={styles.colon}>:</Text>
        </View>

        {/* Scrollable Minute Wheel */}
        <WheelColumn
          label="MINUTE"
          data={MINUTES}
          selectedIndex={minuteIndex}
          onSelect={handleMinuteSelect}
          formatItem={(m) => (m < 10 ? `0${m}` : `${m}`)}
          width={76}
        />

        {/* Scrollable AM / PM Wheel */}
        <WheelColumn
          label="PERIOD"
          data={PERIODS}
          selectedIndex={periodIndex}
          onSelect={handlePeriodSelect}
          formatItem={(p) => p}
          width={68}
        />
      </View>

      <Text style={styles.scrollTip}>↕ Swipe columns up or down to set alarm time</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.borderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  cardLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  previewTimeText: {
    ...Typography.bodyBold,
    color: Colors.primary,
    fontSize: 16,
  },
  previewPeriodText: {
    fontSize: 13,
    color: Colors.primaryLight,
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: WHEEL_HEIGHT,
    position: 'relative',
    marginVertical: Spacing.xs,
  },
  centerSelectionBanner: {
    position: 'absolute',
    top: ITEM_HEIGHT,
    left: 8,
    right: 8,
    height: ITEM_HEIGHT,
    borderRadius: Spacing.borderRadius.md,
    backgroundColor: 'rgba(255, 149, 0, 0.08)',
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: 'rgba(255, 149, 0, 0.45)',
  },
  columnWrapper: {
    alignItems: 'center',
  },
  wheelHeaderLabel: {
    ...Typography.caption,
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2,
  },
  wheelContainer: {
    height: WHEEL_HEIGHT,
    width: '100%',
  },
  itemBox: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemBoxSelected: {
    // Center selected
  },
  itemText: {
    ...Typography.hero,
    textAlign: 'center',
  },
  itemTextSelected: {
    fontSize: 32,
    color: Colors.textPrimary,
    fontWeight: '800',
  },
  itemTextMuted: {
    fontSize: 20,
    color: Colors.textMuted,
    fontWeight: '500',
    opacity: 0.45,
  },
  colonContainer: {
    height: WHEEL_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingTop: 16,
  },
  colon: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.primary,
  },
  scrollTip: {
    ...Typography.caption,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.sm,
    fontSize: 11,
  },
});
