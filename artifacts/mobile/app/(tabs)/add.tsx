import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CategoryGrid } from "@/components/CategoryGrid";
import { DatePickerModal } from "@/components/DatePickerModal";
import { useAuth } from "@/context/AuthContext";
import {
  dateToString,
  formatINR,
  useExpenses,
} from "@/context/ExpenseContext";
import { useColors } from "@/hooks/useColors";
import { uploadBill } from "@/lib/uploadBill";

function todayStr() {
  return dateToString(new Date());
}
function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dateToString(d);
}

export default function AddExpenseScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { allCategories, addExpense } = useExpenses();

  const [amountRaw, setAmountRaw] = useState("");
  const [category, setCategory] = useState(allCategories[0]?.name ?? "Food");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayStr());
  const [saving, setSaving] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [billUri, setBillUri] = useState<string | null>(null);
  const [billMime, setBillMime] = useState<string | null>(null);

  const amount = parseFloat(amountRaw) || 0;
  const canSave = amount > 0 && category;

  // Tab bar overlays content (absolute). Keep Save button above it.
  const tabBarHeight = Platform.OS === "web" ? 84 : 56 + insets.bottom;
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const displayAmount = amount > 0 ? formatINR(amount) : "₹0";
  const isCustomDate = date !== todayStr() && date !== yesterdayStr();

  const pickBill = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission needed",
        "Allow photo library access to attach a bill."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.75,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets[0]) {
      setBillUri(result.assets[0].uri);
      setBillMime(result.assets[0].mimeType ?? null);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleSave = async () => {
    if (!canSave || saving || !user) return;
    setSaving(true);
    try {
      let billUrl: string | null = null;
      if (billUri) {
        billUrl = await uploadBill(user.id, billUri, billMime);
      }
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await addExpense({
        amount,
        category,
        note,
        date,
        billUrl,
      });
      setAmountRaw("");
      setNote("");
      setDate(todayStr());
      setBillUri(null);
      setBillMime(null);
      router.push("/(tabs)/");
    } catch (err: any) {
      Alert.alert(
        "Could not save",
        err?.message ?? "Something went wrong. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 8,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>Add Expense</Text>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingBottom: tabBarHeight + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Amount display */}
        <View
          style={[
            styles.amountCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.amountLabel, { color: colors.mutedForeground }]}>
            Amount
          </Text>
          <Text
            style={[
              styles.amountDisplay,
              { color: amount > 0 ? colors.foreground : colors.mutedForeground },
            ]}
          >
            {displayAmount}
          </Text>
          <TextInput
            value={amountRaw}
            onChangeText={setAmountRaw}
            keyboardType="decimal-pad"
            placeholder="Enter amount"
            placeholderTextColor={colors.mutedForeground}
            style={[
              styles.amountInput,
              {
                color: colors.foreground,
                backgroundColor: colors.input,
                borderColor: colors.border,
              },
            ]}
          />
        </View>

        {/* Date selector */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            Date
          </Text>
          <View style={styles.dateRow}>
            {[
              { label: "Today", value: todayStr() },
              { label: "Yesterday", value: yesterdayStr() },
            ].map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => setDate(opt.value)}
                style={[
                  styles.dateChip,
                  {
                    backgroundColor:
                      date === opt.value ? colors.primary : colors.card,
                    borderColor:
                      date === opt.value ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.dateChipText,
                    {
                      color:
                        date === opt.value
                          ? colors.primaryForeground
                          : colors.foreground,
                    },
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}

            <Pressable
              onPress={() => setShowCalendar(true)}
              style={[
                styles.dateChip,
                styles.calendarChip,
                {
                  backgroundColor: isCustomDate ? colors.primary : colors.card,
                  borderColor: isCustomDate ? colors.primary : colors.border,
                  flex: 1,
                },
              ]}
            >
              <Ionicons
                name="calendar-outline"
                size={16}
                color={
                  isCustomDate
                    ? colors.primaryForeground
                    : colors.foreground
                }
              />
              <Text
                style={[
                  styles.dateChipText,
                  {
                    color: isCustomDate
                      ? colors.primaryForeground
                      : colors.foreground,
                  },
                ]}
                numberOfLines={1}
              >
                {isCustomDate ? date : "Pick date"}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Category */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            Category
          </Text>
          <CategoryGrid
            categories={allCategories}
            selected={category}
            onSelect={setCategory}
          />
        </View>

        {/* Note */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            Note (optional)
          </Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="What was this for?"
            placeholderTextColor={colors.mutedForeground}
            style={[
              styles.noteInput,
              {
                color: colors.foreground,
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
            multiline
            numberOfLines={2}
          />
        </View>

        {/* Bill upload */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            Bill / Receipt (optional)
          </Text>
          {billUri ? (
            <View
              style={[
                styles.billPreview,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Image source={{ uri: billUri }} style={styles.billImage} />
              <View style={styles.billActions}>
                <Pressable
                  onPress={pickBill}
                  style={[styles.billActionBtn, { backgroundColor: colors.secondary }]}
                >
                  <Ionicons name="swap-horizontal" size={16} color={colors.primary} />
                  <Text style={[styles.billActionText, { color: colors.primary }]}>
                    Change
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setBillUri(null);
                    setBillMime(null);
                  }}
                  style={[styles.billActionBtn, { backgroundColor: "#FF475722" }]}
                >
                  <Ionicons name="trash-outline" size={16} color="#FF4757" />
                  <Text style={[styles.billActionText, { color: "#FF4757" }]}>
                    Remove
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              onPress={pickBill}
              style={[
                styles.billUpload,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View
                style={[
                  styles.billUploadIcon,
                  { backgroundColor: colors.secondary },
                ]}
              >
                <Ionicons name="camera-outline" size={22} color={colors.primary} />
              </View>
              <View style={styles.billUploadText}>
                <Text style={[styles.billUploadTitle, { color: colors.foreground }]}>
                  Upload bill photo
                </Text>
                <Text
                  style={[styles.billUploadHint, { color: colors.mutedForeground }]}
                >
                  Keep a copy of the receipt for your records
                </Text>
              </View>
              <Ionicons
                name="cloud-upload-outline"
                size={20}
                color={colors.mutedForeground}
              />
            </Pressable>
          )}
        </View>
      </ScrollView>

      {/* Save button — sits above the tab bar */}
      <View
        style={[
          styles.footer,
          {
            bottom: tabBarHeight,
            backgroundColor: colors.background,
            borderTopColor: colors.border,
          },
        ]}
      >
        <Pressable
          onPress={handleSave}
          disabled={!canSave || saving}
          style={({ pressed }) => [
            styles.saveBtn,
            {
              backgroundColor: canSave ? colors.primary : colors.muted,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          {saving ? (
            <ActivityIndicator
              color={canSave ? colors.primaryForeground : colors.mutedForeground}
            />
          ) : (
            <Ionicons
              name="checkmark"
              size={20}
              color={canSave ? colors.primaryForeground : colors.mutedForeground}
            />
          )}
          <Text
            style={[
              styles.saveBtnText,
              {
                color: canSave
                  ? colors.primaryForeground
                  : colors.mutedForeground,
              },
            ]}
          >
            {saving ? "Saving…" : "Save Expense"}
          </Text>
        </Pressable>
      </View>

      <DatePickerModal
        visible={showCalendar}
        value={date}
        onSelect={setDate}
        onClose={() => setShowCalendar(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 20,
  },
  amountCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 10,
    alignItems: "center",
  },
  amountLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  amountDisplay: {
    fontSize: 42,
    fontFamily: "Inter_700Bold",
  },
  amountInput: {
    height: 46,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 18,
    fontFamily: "Inter_500Medium",
    width: "100%",
    textAlign: "center",
  },
  section: {
    gap: 10,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  dateRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  dateChip: {
    paddingHorizontal: 14,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarChip: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
  },
  dateChipText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    minHeight: 70,
    textAlignVertical: "top",
  },
  billUpload: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    borderStyle: "dashed",
    padding: 14,
  },
  billUploadIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  billUploadText: {
    flex: 1,
    gap: 2,
  },
  billUploadTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  billUploadHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  billPreview: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: "hidden",
  },
  billImage: {
    width: "100%",
    height: 180,
    resizeMode: "cover",
  },
  billActions: {
    flexDirection: "row",
    gap: 8,
    padding: 10,
  },
  billActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 38,
    borderRadius: 10,
  },
  billActionText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
  },
  saveBtn: {
    height: 54,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  saveBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
});
