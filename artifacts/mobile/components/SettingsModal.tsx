import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useManager } from "@/context/ManagerContext";
import { useColors } from "@/hooks/useColors";

interface Props {
  visible: boolean;
  onClose: () => void;
  // Budget section props
  currentBudget: number;
  onSaveBudget: (val: number) => void;
}

function SectionHeader({ title, colors }: { title: string; colors: ReturnType<typeof useColors> }) {
  return (
    <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>
      {title}
    </Text>
  );
}

function Row({ label, value, icon, onPress, destructive, colors }: {
  label: string;
  value?: string;
  icon: string;
  onPress?: () => void;
  destructive?: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.card, borderColor: colors.border },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Ionicons
        name={icon as any}
        size={18}
        color={destructive ? colors.destructive : colors.primary}
        style={styles.rowIcon}
      />
      <Text
        style={[
          styles.rowLabel,
          { color: destructive ? colors.destructive : colors.foreground },
        ]}
      >
        {label}
      </Text>
      {value ? (
        <Text style={[styles.rowValue, { color: colors.mutedForeground }]}>
          {value}
        </Text>
      ) : null}
      {onPress && (
        <Ionicons
          name="chevron-forward"
          size={16}
          color={colors.mutedForeground}
        />
      )}
    </Pressable>
  );
}

export function SettingsModal({ visible, onClose, currentBudget, onSaveBudget }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const {
    myGrants,
    managerOf,
    isLoadingGrants,
    grantAccess,
    revokeAccess,
    reload,
    viewingAs,
    viewingAsEmail,
    setViewingAs,
  } = useManager();

  const [budgetInput, setBudgetInput] = useState(String(currentBudget || ""));
  const [grantEmailInput, setGrantEmailInput] = useState("");
  const [isGranting, setIsGranting] = useState(false);
  const [grantError, setGrantError] = useState<string | null>(null);
  const [showGrantInput, setShowGrantInput] = useState(false);

  const topPadding = Platform.OS === "web" ? 24 : insets.top;

  const saveBudget = () => {
    const val = parseFloat(budgetInput.replace(/,/g, ""));
    if (!isNaN(val) && val > 0) {
      onSaveBudget(val);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Alert.alert("Invalid amount", "Please enter a valid budget amount.");
    }
  };

  const handleGrantAccess = async () => {
    if (!grantEmailInput.trim()) return;
    setIsGranting(true);
    setGrantError(null);
    const err = await grantAccess(grantEmailInput.trim());
    setIsGranting(false);
    if (err) {
      setGrantError(err);
    } else {
      setGrantEmailInput("");
      setShowGrantInput(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleRevoke = (grantId: string, email: string) => {
    Alert.alert(
      "Remove access",
      `Remove manager access for ${email}? They will no longer be able to view your expenses.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            await revokeAccess(grantId);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          },
        },
      ]
    );
  };

  const handleSwitchView = (ownerUserId: string, ownerEmail: string) => {
    setViewingAs(ownerUserId, ownerEmail);
    onClose();
  };

  const handleExitManagerMode = () => {
    setViewingAs(null, null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === "ios" ? "pageSheet" : "fullScreen"}
      onRequestClose={onClose}
    >
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              paddingTop: topPadding + 8,
              borderBottomColor: colors.border,
              backgroundColor: colors.background,
            },
          ]}
        >
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            Settings
          </Text>
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.foreground} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + 40 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Account */}
          <SectionHeader title="ACCOUNT" colors={colors} />
          <View
            style={[
              styles.accountCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View
              style={[styles.avatar, { backgroundColor: colors.primary + "20" }]}
            >
              <Ionicons name="person" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.accountEmail, { color: colors.foreground }]}>
                {user?.email ?? ""}
              </Text>
              <Text style={[styles.accountSub, { color: colors.mutedForeground }]}>
                Signed in
              </Text>
            </View>
          </View>

          {/* Monthly Budget */}
          <SectionHeader title="MONTHLY BUDGET" colors={colors} />
          <View
            style={[
              styles.budgetCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.budgetLabel, { color: colors.mutedForeground }]}>
              Budget (₹)
            </Text>
            <View style={styles.budgetRow}>
              <TextInput
                style={[
                  styles.budgetInput,
                  {
                    color: colors.foreground,
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                  },
                ]}
                value={budgetInput}
                onChangeText={setBudgetInput}
                keyboardType="numeric"
                placeholder="Enter amount"
                placeholderTextColor={colors.mutedForeground}
                returnKeyType="done"
                onSubmitEditing={saveBudget}
              />
              <Pressable
                onPress={saveBudget}
                style={[styles.saveBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>
                  Save
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Manager Access — Manager Mode switcher (if this user is a manager) */}
          {managerOf.length > 0 && (
            <>
              <SectionHeader title="MANAGER ACCESS" colors={colors} />
              <View
                style={[
                  styles.managerCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View style={styles.managerCardHeader}>
                  <Ionicons
                    name="eye-outline"
                    size={18}
                    color={colors.primary}
                  />
                  <Text
                    style={[styles.managerCardTitle, { color: colors.foreground }]}
                  >
                    Accounts you can monitor
                  </Text>
                </View>
                <Text
                  style={[styles.managerCardSub, { color: colors.mutedForeground }]}
                >
                  Switch to view someone else's expenses in read-only mode.
                </Text>

                {viewingAs && (
                  <Pressable
                    onPress={handleExitManagerMode}
                    style={[
                      styles.exitManagerBtn,
                      { borderColor: colors.destructive + "60" },
                    ]}
                  >
                    <Ionicons
                      name="arrow-undo-outline"
                      size={16}
                      color={colors.destructive}
                    />
                    <Text style={[styles.exitManagerText, { color: colors.destructive }]}>
                      Exit manager view
                    </Text>
                  </Pressable>
                )}

                {managerOf.map((g) => (
                  <Pressable
                    key={g.id}
                    onPress={() => handleSwitchView(g.ownerUserId, g.ownerEmail)}
                    style={[
                      styles.grantRow,
                      {
                        borderColor:
                          viewingAs === g.ownerUserId
                            ? colors.primary
                            : colors.border,
                        backgroundColor:
                          viewingAs === g.ownerUserId
                            ? colors.primary + "10"
                            : colors.background,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.grantAvatar,
                        { backgroundColor: colors.primary + "20" },
                      ]}
                    >
                      <Ionicons
                        name="person-outline"
                        size={16}
                        color={colors.primary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[styles.grantEmail, { color: colors.foreground }]}
                        numberOfLines={1}
                      >
                        {g.ownerEmail}
                      </Text>
                      <Text
                        style={[
                          styles.grantStatus,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        {viewingAs === g.ownerUserId
                          ? "Currently viewing"
                          : "Tap to view"}
                      </Text>
                    </View>
                    {viewingAs === g.ownerUserId ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={colors.primary}
                      />
                    ) : (
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={colors.mutedForeground}
                      />
                    )}
                  </Pressable>
                ))}
              </View>
            </>
          )}

          {/* Grant Manager Access (owner side) */}
          <SectionHeader title="SHARE WITH MANAGER" colors={colors} />
          <View
            style={[
              styles.managerCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.managerCardHeader}>
              <Ionicons
                name="shield-checkmark-outline"
                size={18}
                color={colors.primary}
              />
              <Text
                style={[styles.managerCardTitle, { color: colors.foreground }]}
              >
                Manager access
              </Text>
            </View>
            <Text
              style={[styles.managerCardSub, { color: colors.mutedForeground }]}
            >
              Give your manager read-only access to view your expense history and
              analytics. They cannot add or delete anything.
            </Text>

            {isLoadingGrants ? (
              <ActivityIndicator
                size="small"
                color={colors.primary}
                style={{ marginTop: 12 }}
              />
            ) : (
              <>
                {myGrants.length > 0 && (
                  <View style={{ marginTop: 12, gap: 8 }}>
                    {myGrants.map((g) => (
                      <View
                        key={g.id}
                        style={[
                          styles.grantRow,
                          { borderColor: colors.border, backgroundColor: colors.background },
                        ]}
                      >
                        <View
                          style={[
                            styles.grantAvatar,
                            { backgroundColor: colors.accent + "20" },
                          ]}
                        >
                          <Ionicons
                            name="person-outline"
                            size={16}
                            color={colors.accent}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[styles.grantEmail, { color: colors.foreground }]}
                            numberOfLines={1}
                          >
                            {g.managerEmail}
                          </Text>
                          <Text
                            style={[
                              styles.grantStatus,
                              {
                                color:
                                  g.status === "active"
                                    ? colors.accent
                                    : colors.mutedForeground,
                              },
                            ]}
                          >
                            {g.status === "active"
                              ? "Active — can view your expenses"
                              : "Pending — waiting for manager to sign up"}
                          </Text>
                        </View>
                        <Pressable
                          onPress={() => handleRevoke(g.id, g.managerEmail)}
                          hitSlop={12}
                        >
                          <Ionicons
                            name="close-circle-outline"
                            size={22}
                            color={colors.destructive}
                          />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}

                {showGrantInput ? (
                  <View style={{ marginTop: 12, gap: 8 }}>
                    <TextInput
                      style={[
                        styles.emailInput,
                        {
                          color: colors.foreground,
                          borderColor: grantError ? colors.destructive : colors.border,
                          backgroundColor: colors.background,
                        },
                      ]}
                      value={grantEmailInput}
                      onChangeText={(t) => {
                        setGrantEmailInput(t);
                        setGrantError(null);
                      }}
                      placeholder="manager@company.com"
                      placeholderTextColor={colors.mutedForeground}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="done"
                      onSubmitEditing={handleGrantAccess}
                    />
                    {grantError && (
                      <Text style={[styles.errorText, { color: colors.destructive }]}>
                        {grantError}
                      </Text>
                    )}
                    <View style={styles.grantBtnRow}>
                      <Pressable
                        onPress={() => {
                          setShowGrantInput(false);
                          setGrantEmailInput("");
                          setGrantError(null);
                        }}
                        style={[
                          styles.cancelBtn,
                          { borderColor: colors.border },
                        ]}
                      >
                        <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>
                          Cancel
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={handleGrantAccess}
                        disabled={isGranting || !grantEmailInput.trim()}
                        style={[
                          styles.grantBtn,
                          {
                            backgroundColor:
                              grantEmailInput.trim()
                                ? colors.primary
                                : colors.muted,
                          },
                        ]}
                      >
                        {isGranting ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text
                            style={[
                              styles.grantBtnText,
                              { color: colors.primaryForeground },
                            ]}
                          >
                            Grant access
                          </Text>
                        )}
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => setShowGrantInput(true)}
                    style={[
                      styles.addManagerBtn,
                      { borderColor: colors.primary + "40" },
                    ]}
                  >
                    <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                    <Text style={[styles.addManagerText, { color: colors.primary }]}>
                      Add manager
                    </Text>
                  </Pressable>
                )}
              </>
            )}
          </View>

          {/* Sign out */}
          <SectionHeader title="DANGER ZONE" colors={colors} />
          <Pressable
            onPress={() =>
              Alert.alert(
                "Sign out",
                "Are you sure you want to sign out?",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Sign out",
                    style: "destructive",
                    onPress: signOut,
                  },
                ]
              )
            }
            style={({ pressed }) => [
              styles.row,
              {
                backgroundColor: colors.destructive + "10",
                borderColor: colors.destructive + "30",
              },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Ionicons
              name="log-out-outline"
              size={18}
              color={colors.destructive}
              style={styles.rowIcon}
            />
            <Text style={[styles.rowLabel, { color: colors.destructive }]}>
              Sign out
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 12,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  closeBtn: {
    position: "absolute",
    right: 20,
    bottom: 12,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 8,
  },
  sectionHeader: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    marginTop: 12,
    marginBottom: 4,
    marginLeft: 4,
  },
  accountCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  accountEmail: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  accountSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  budgetCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  budgetLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  budgetRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  budgetInput: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  saveBtn: {
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  managerCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  managerCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  managerCardTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  managerCardSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  grantRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
    marginTop: 4,
  },
  grantAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  grantEmail: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  grantStatus: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  emailInput: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  errorText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  grantBtnRow: {
    flexDirection: "row",
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  grantBtn: {
    flex: 2,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  grantBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  addManagerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    gap: 8,
    marginTop: 8,
  },
  addManagerText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  exitManagerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    marginTop: 4,
  },
  exitManagerText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  rowIcon: { marginRight: 2 },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  rowValue: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginRight: 4,
  },
});
