import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  currentMonth,
  dateToString,
  formatMonth,
} from "@/context/ExpenseContext";
import { useColors } from "@/hooks/useColors";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function monthOffset(base: string, off: number): string {
  const [y, m] = base.split("-").map(Number);
  const d = new Date(y, m - 1 + off, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

interface Props {
  visible: boolean;
  value: string;
  onSelect: (date: string) => void;
  onClose: () => void;
}

export function DatePickerModal({ visible, value, onSelect, onClose }: Props) {
  const colors = useColors();
  const initialMonth = value.slice(0, 7) || currentMonth();
  const [month, setMonth] = useState(initialMonth);

  // Reset month when modal opens with a new value
  React.useEffect(() => {
    if (visible) {
      setMonth(value.slice(0, 7) || currentMonth());
    }
  }, [visible, value]);

  const { year, mon, firstDOW, daysInMonth } = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const first = new Date(y, m - 1, 1);
    const last = new Date(y, m, 0);
    return {
      year: y,
      mon: m,
      firstDOW: first.getDay(),
      daysInMonth: last.getDate(),
    };
  }, [month]);

  const cells: (number | null)[] = [
    ...Array.from({ length: firstDOW }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const today = dateToString(new Date());

  function makeDateStr(day: number) {
    return `${year}-${String(mon).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.header}>
            <Pressable onPress={() => setMonth((m) => monthOffset(m, -1))} hitSlop={12}>
              <Ionicons name="chevron-back" size={22} color={colors.foreground} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>
              {formatMonth(month)}
            </Text>
            <Pressable onPress={() => setMonth((m) => monthOffset(m, 1))} hitSlop={12}>
              <Ionicons name="chevron-forward" size={22} color={colors.foreground} />
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {WEEKDAYS.map((wd) => (
              <Text
                key={wd}
                style={[styles.weekDay, { color: colors.mutedForeground }]}
              >
                {wd}
              </Text>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {cells.map((day, i) => {
              if (day === null) {
                return <View key={`empty-${i}`} style={styles.dayCell} />;
              }
              const dateStr = makeDateStr(day);
              const isSelected = dateStr === value;
              const isToday = dateStr === today;

              return (
                <Pressable
                  key={dateStr}
                  onPress={() => {
                    onSelect(dateStr);
                    onClose();
                  }}
                  style={[
                    styles.dayCell,
                    isSelected && {
                      backgroundColor: colors.primary,
                      borderRadius: 10,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayNum,
                      {
                        color: isSelected
                          ? colors.primaryForeground
                          : isToday
                          ? colors.primary
                          : colors.foreground,
                        fontFamily:
                          isToday || isSelected
                            ? "Inter_700Bold"
                            : "Inter_400Regular",
                      },
                    ]}
                  >
                    {day}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={onClose}
            style={[styles.cancelBtn, { borderColor: colors.border }]}
          >
            <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>
              Cancel
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  sheet: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  weekRow: {
    flexDirection: "row",
  },
  weekDay: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: `${100 / 7}%` as any,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dayNum: {
    fontSize: 14,
  },
  cancelBtn: {
    marginTop: 4,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
});
