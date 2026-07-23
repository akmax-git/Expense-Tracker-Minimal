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
import {
  CategoryInfo,
  isDefaultCategory,
  useExpenses,
} from "@/context/ExpenseContext";
import {
  MANAGER_PERMISSIONS,
  ManagerPermission,
  permissionLabel,
  useManager,
} from "@/context/ManagerContext";
import { useColors } from "@/hooks/useColors";

const CATEGORY_ICONS = [
  "restaurant-outline",
  "cafe-outline",
  "car-outline",
  "bag-handle-outline",
  "film-outline",
  "home-outline",
  "laptop-outline",
  "airplane-outline",
  "grid-outline",
  "medical-outline",
  "fitness-outline",
  "school-outline",
  "gift-outline",
  "card-outline",
  "phone-portrait-outline",
  "paw-outline",
  "construct-outline",
  "flash-outline",
  "water-outline",
  "musical-notes-outline",
] as const;

const CATEGORY_COLORS = [
  "#FF9F43",
  "#A29BFE",
  "#74B9FF",
  "#FD79A8",
  "#FDCB6E",
  "#55EFC4",
  "#00CEC9",
  "#6C5CE7",
  "#636E72",
  "#E17055",
  "#00B894",
  "#0984E3",
  "#D63031",
  "#2D3436",
];

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

/** Alert.alert button callbacks are unreliable on web — use window.confirm there. */
function confirmDestructive(
  title: string,
  message: string,
  confirmLabel = "Remove"
): Promise<boolean> {
  if (Platform.OS === "web") {
    if (typeof window === "undefined") return Promise.resolve(false);
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      {
        text: confirmLabel,
        style: "destructive",
        onPress: () => resolve(true),
      },
    ]);
  });
}

function notify(title: string, message: string) {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
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
  const { allCategories, addCustomCategory, removeCustomCategory } = useExpenses();
  const {
    myGrants,
    managerOf,
    isLoadingGrants,
    grantAccess,
    updatePermission,
    revokeAccess,
    viewingAs,
    setViewingAs,
    isManagerMode,
    canManageBudget,
  } = useManager();

  const [budgetInput, setBudgetInput] = useState(String(currentBudget || ""));
  const [grantEmailInput, setGrantEmailInput] = useState("");
  const [grantPermission, setGrantPermission] =
    useState<ManagerPermission>("read");
  const [isGranting, setIsGranting] = useState(false);
  const [grantError, setGrantError] = useState<string | null>(null);
  const [showGrantInput, setShowGrantInput] = useState(false);
  const [updatingGrantId, setUpdatingGrantId] = useState<string | null>(null);

  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] =
    useState<string>(CATEGORY_ICONS[0]);
  const [newCategoryColor, setNewCategoryColor] = useState(CATEGORY_COLORS[0]);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [savingCategory, setSavingCategory] = useState(false);

  const topPadding = Platform.OS === "web" ? 24 : insets.top;

  const saveBudget = () => {
    if (isManagerMode && !canManageBudget) {
      notify(
        "No budget access",
        "Your manager access is view/edit only. Ask the owner for Full access to change budget."
      );
      return;
    }
    const val = parseFloat(budgetInput.replace(/,/g, ""));
    if (!isNaN(val) && val > 0) {
      onSaveBudget(val);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      notify("Invalid amount", "Please enter a valid budget amount.");
    }
  };

  const handleGrantAccess = async () => {
    if (!grantEmailInput.trim()) return;
    const email = grantEmailInput.trim().toLowerCase();
    setIsGranting(true);
    setGrantError(null);
    const { error, emailSent } = await grantAccess(email, grantPermission);
    setIsGranting(false);
    if (error) {
      setGrantError(error);
    } else {
      const level = permissionLabel(grantPermission);
      setGrantEmailInput("");
      setGrantPermission("read");
      setShowGrantInput(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (emailSent) {
        notify(
          "Invite email sent",
          `Access level: ${level}.\n\nAn email was sent to ${email} with a sign-in link.\n\nThey should open that email, click the link (or sign up with that exact email), then the shared expenses open automatically — no need to dig through Settings.`
        );
      } else {
        notify(
          "Manager invited",
          `Access level: ${level}.\n\nWe couldn't send the email automatically (check Supabase Auth email settings).\n\nAsk ${email} to open this app and sign up / sign in with that exact email. Shared expenses will open automatically after login.`
        );
      }
    }
  };

  const handleChangePermission = async (
    grantId: string,
    permission: ManagerPermission
  ) => {
    setUpdatingGrantId(grantId);
    const err = await updatePermission(grantId, permission);
    setUpdatingGrantId(null);
    if (err) {
      notify("Could not update", err);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleRevoke = async (grantId: string, email: string) => {
    const confirmed = await confirmDestructive(
      "Remove access",
      `Remove manager access for ${email}? They will no longer be able to view your expenses.`
    );
    if (!confirmed) return;
    await revokeAccess(grantId);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  const handleSwitchView = (ownerUserId: string, ownerEmail: string) => {
    setViewingAs(ownerUserId, ownerEmail);
    onClose();
  };

  const handleExitManagerMode = () => {
    setViewingAs(null, null);
    onClose();
  };

  const resetCategoryForm = () => {
    setShowAddCategory(false);
    setNewCategoryName("");
    setNewCategoryIcon(CATEGORY_ICONS[0]);
    setNewCategoryColor(CATEGORY_COLORS[0]);
    setCategoryError(null);
  };

  const handleAddCategory = async () => {
    setSavingCategory(true);
    setCategoryError(null);
    const err = await addCustomCategory({
      name: newCategoryName,
      icon: newCategoryIcon,
      color: newCategoryColor,
    });
    setSavingCategory(false);
    if (err) {
      setCategoryError(err);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    resetCategoryForm();
  };

  const handleRemoveCategory = async (cat: CategoryInfo) => {
    if (isDefaultCategory(cat.name)) {
      notify(
        "Default category",
        "Built-in categories stay available so your existing expenses keep working."
      );
      return;
    }
    const confirmed = await confirmDestructive(
      "Delete category",
      `Remove "${cat.name}"? Existing expenses with this category will keep their label.`
    );
    if (!confirmed) return;
    const err = await removeCustomCategory(cat.name);
    if (err) {
      notify("Could not delete", err);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
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
            {isManagerMode && !canManageBudget ? (
              <Text style={[styles.budgetLocked, { color: colors.mutedForeground }]}>
                ₹{currentBudget || 0} — Full access required to change
              </Text>
            ) : (
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
            )}
          </View>

          {/* Categories */}
          <SectionHeader title="CATEGORIES" colors={colors} />
          <View
            style={[
              styles.managerCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.managerCardHeader}>
              <Ionicons name="pricetags-outline" size={18} color={colors.primary} />
              <Text style={[styles.managerCardTitle, { color: colors.foreground }]}>
                Expense categories
              </Text>
            </View>
            <Text style={[styles.managerCardSub, { color: colors.mutedForeground }]}>
              Default categories stay for your existing expenses. Add your own
              when you need more.
            </Text>

            <View style={{ marginTop: 10, gap: 8 }}>
              {allCategories.map((cat) => {
                const isDefault = isDefaultCategory(cat.name);
                return (
                  <View
                    key={cat.name}
                    style={[
                      styles.categoryRow,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.background,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.categoryIconWrap,
                        { backgroundColor: cat.color + "22" },
                      ]}
                    >
                      <Ionicons
                        name={cat.icon as any}
                        size={18}
                        color={cat.color}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[styles.grantEmail, { color: colors.foreground }]}
                        numberOfLines={1}
                      >
                        {cat.name}
                      </Text>
                      <Text
                        style={[
                          styles.grantStatus,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        {isDefault ? "Default" : "Custom"}
                      </Text>
                    </View>
                    {!isDefault ? (
                      <Pressable
                        onPress={() => handleRemoveCategory(cat)}
                        hitSlop={10}
                        accessibilityRole="button"
                        accessibilityLabel={`Delete ${cat.name}`}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={18}
                          color={colors.destructive}
                        />
                      </Pressable>
                    ) : (
                      <Ionicons
                        name="lock-closed-outline"
                        size={16}
                        color={colors.mutedForeground}
                      />
                    )}
                  </View>
                );
              })}
            </View>

            {showAddCategory ? (
              <View style={{ marginTop: 12, gap: 10 }}>
                <TextInput
                  style={[
                    styles.emailInput,
                    {
                      color: colors.foreground,
                      borderColor: categoryError
                        ? colors.destructive
                        : colors.border,
                      backgroundColor: colors.background,
                    },
                  ]}
                  value={newCategoryName}
                  onChangeText={(t) => {
                    setNewCategoryName(t);
                    setCategoryError(null);
                  }}
                  placeholder="Category name (e.g. Medical)"
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="words"
                  maxLength={24}
                  returnKeyType="done"
                  onSubmitEditing={handleAddCategory}
                />

                <Text
                  style={[styles.accessLevelLabel, { color: colors.mutedForeground }]}
                >
                  ICON
                </Text>
                <View style={styles.pickerWrap}>
                  {CATEGORY_ICONS.map((icon) => {
                    const selected = newCategoryIcon === icon;
                    return (
                      <Pressable
                        key={icon}
                        onPress={() => setNewCategoryIcon(icon)}
                        style={[
                          styles.iconPick,
                          {
                            borderColor: selected
                              ? newCategoryColor
                              : colors.border,
                            backgroundColor: selected
                              ? newCategoryColor + "22"
                              : colors.background,
                          },
                        ]}
                      >
                        <Ionicons
                          name={icon as any}
                          size={18}
                          color={selected ? newCategoryColor : colors.foreground}
                        />
                      </Pressable>
                    );
                  })}
                </View>

                <Text
                  style={[styles.accessLevelLabel, { color: colors.mutedForeground }]}
                >
                  COLOR
                </Text>
                <View style={styles.pickerWrap}>
                  {CATEGORY_COLORS.map((color) => {
                    const selected = newCategoryColor === color;
                    return (
                      <Pressable
                        key={color}
                        onPress={() => setNewCategoryColor(color)}
                        style={[
                          styles.colorPick,
                          {
                            backgroundColor: color,
                            borderColor: selected
                              ? colors.foreground
                              : "transparent",
                          },
                        ]}
                      >
                        {selected ? (
                          <Ionicons name="checkmark" size={14} color="#fff" />
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>

                {categoryError ? (
                  <Text style={[styles.errorText, { color: colors.destructive }]}>
                    {categoryError}
                  </Text>
                ) : null}

                <View style={styles.grantBtnRow}>
                  <Pressable
                    onPress={resetCategoryForm}
                    style={[styles.cancelBtn, { borderColor: colors.border }]}
                  >
                    <Text
                      style={[
                        styles.cancelBtnText,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      Cancel
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleAddCategory}
                    disabled={savingCategory || !newCategoryName.trim()}
                    style={[
                      styles.grantBtn,
                      {
                        backgroundColor: newCategoryName.trim()
                          ? colors.primary
                          : colors.muted,
                      },
                    ]}
                  >
                    {savingCategory ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text
                        style={[
                          styles.grantBtnText,
                          { color: colors.primaryForeground },
                        ]}
                      >
                        Add category
                      </Text>
                    )}
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                onPress={() => setShowAddCategory(true)}
                style={[
                  styles.addManagerBtn,
                  { borderColor: colors.primary + "40" },
                ]}
              >
                <Ionicons
                  name="add-circle-outline"
                  size={18}
                  color={colors.primary}
                />
                <Text style={[styles.addManagerText, { color: colors.primary }]}>
                  Add category
                </Text>
              </Pressable>
            )}
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
                  Switch to view someone else's expenses. Shared accounts open
                  automatically when you sign in.
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
                          ? `Currently viewing · ${permissionLabel(g.permission)}`
                          : `${permissionLabel(g.permission)} · Tap to view`}
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
              Give your manager access to your expenses. Choose how much they can do —
              Read only, View & Edit, or Full access.
              {"\n\n"}
              We email them a sign-in link. After they open it, your expenses show
              automatically with the access you chose.
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
                          styles.grantRowWrap,
                          { borderColor: colors.border, backgroundColor: colors.background },
                        ]}
                      >
                        <View style={styles.grantRowTop}>
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
                                ? `Active · ${permissionLabel(g.permission)}`
                                : `Pending · ${permissionLabel(g.permission)}`}
                            </Text>
                          </View>
                          <Pressable
                            onPress={() => handleRevoke(g.id, g.managerEmail)}
                            hitSlop={12}
                            accessibilityRole="button"
                            accessibilityLabel={`Remove ${g.managerEmail}`}
                            style={({ pressed }) => [
                              styles.revokeBtn,
                              pressed && { opacity: 0.6 },
                            ]}
                          >
                            <Ionicons
                              name="close-circle"
                              size={24}
                              color={colors.destructive}
                            />
                          </Pressable>
                        </View>

                        <View style={styles.permissionChipRow}>
                          {MANAGER_PERMISSIONS.map((opt) => {
                            const selected = g.permission === opt.value;
                            const busy = updatingGrantId === g.id;
                            return (
                              <Pressable
                                key={opt.value}
                                disabled={busy}
                                onPress={() =>
                                  handleChangePermission(g.id, opt.value)
                                }
                                style={[
                                  styles.permissionChip,
                                  {
                                    backgroundColor: selected
                                      ? colors.primary
                                      : colors.card,
                                    borderColor: selected
                                      ? colors.primary
                                      : colors.border,
                                    opacity: busy ? 0.5 : 1,
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.permissionChipText,
                                    {
                                      color: selected
                                        ? colors.primaryForeground
                                        : colors.foreground,
                                    },
                                  ]}
                                >
                                  {opt.label}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {showGrantInput ? (
                  <View style={{ marginTop: 12, gap: 10 }}>
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

                    <Text
                      style={[styles.accessLevelLabel, { color: colors.mutedForeground }]}
                    >
                      ACCESS LEVEL
                    </Text>
                    <View style={{ gap: 8 }}>
                      {MANAGER_PERMISSIONS.map((opt) => {
                        const selected = grantPermission === opt.value;
                        return (
                          <Pressable
                            key={opt.value}
                            onPress={() => setGrantPermission(opt.value)}
                            style={[
                              styles.permissionOption,
                              {
                                borderColor: selected
                                  ? colors.primary
                                  : colors.border,
                                backgroundColor: selected
                                  ? colors.primary + "12"
                                  : colors.background,
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.radioOuter,
                                {
                                  borderColor: selected
                                    ? colors.primary
                                    : colors.mutedForeground,
                                },
                              ]}
                            >
                              {selected ? (
                                <View
                                  style={[
                                    styles.radioInner,
                                    { backgroundColor: colors.primary },
                                  ]}
                                />
                              ) : null}
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text
                                style={[
                                  styles.permissionOptionTitle,
                                  { color: colors.foreground },
                                ]}
                              >
                                {opt.label}
                              </Text>
                              <Text
                                style={[
                                  styles.permissionOptionDesc,
                                  { color: colors.mutedForeground },
                                ]}
                              >
                                {opt.description}
                              </Text>
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>

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
                          setGrantPermission("read");
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
            onPress={async () => {
              const confirmed = await confirmDestructive(
                "Sign out",
                "Are you sure you want to sign out?",
                "Sign out"
              );
              if (confirmed) await signOut();
            }}
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
  budgetLocked: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
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
  grantRowWrap: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  grantRowTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
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
  revokeBtn: {
    padding: 4,
    marginLeft: 4,
  },
  permissionChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  permissionChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  permissionChipText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  accessLevelLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.6,
  },
  permissionOption: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  permissionOptionTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  permissionOptionDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
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
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  categoryIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  pickerWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  iconPick: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  colorPick: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
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
