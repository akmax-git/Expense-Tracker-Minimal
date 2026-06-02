import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { CategoryInfo } from "@/context/ExpenseContext";
import { useColors } from "@/hooks/useColors";

interface Props {
  categories: CategoryInfo[];
  selected: string;
  onSelect: (name: string) => void;
}

export function CategoryGrid({ categories, selected, onSelect }: Props) {
  const colors = useColors();

  return (
    <ScrollView
      horizontal={false}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.grid}
    >
      {categories.map((cat) => {
        const isSelected = selected === cat.name;
        return (
          <Pressable
            key={cat.name}
            onPress={() => onSelect(cat.name)}
            style={({ pressed }) => [
              styles.item,
              {
                backgroundColor: isSelected
                  ? cat.color + "33"
                  : colors.card,
                borderColor: isSelected ? cat.color : colors.border,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <View
              style={[
                styles.iconWrap,
                { backgroundColor: cat.color + "22" },
              ]}
            >
              <Ionicons
                name={cat.icon as Parameters<typeof Ionicons>[0]["name"]}
                size={20}
                color={cat.color}
              />
            </View>
            <Text
              style={[
                styles.label,
                {
                  color: isSelected ? cat.color : colors.foreground,
                  fontFamily: isSelected
                    ? "Inter_600SemiBold"
                    : "Inter_400Regular",
                },
              ]}
              numberOfLines={1}
            >
              {cat.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  item: {
    flexBasis: "30%",
    flexGrow: 1,
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 6,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 12,
    textAlign: "center",
  },
});
