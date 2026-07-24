import { Alert, Platform } from "react-native";

/**
 * Confirm a destructive action. Alert.alert button callbacks are unreliable on
 * web, so we use window.confirm there.
 */
export function confirmDestructive(
  title: string,
  message: string,
  confirmLabel = "Delete"
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
