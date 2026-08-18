import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { PLATFORM_CATALOG, PlatformId } from "../../../types/models";

interface Props {
  selected: PlatformId[];
  onToggle: (platform: PlatformId) => void;
}

/**
 * Deliberately labels each platform's real mechanism (one-click vs.
 * assisted) rather than presenting a uniform checklist — see
 * docs/04-technical-feasibility.md and docs/12-ux-wireframes.md §1.
 */
export function PlatformSelector({ selected, onToggle }: Props) {
  const platforms = Object.values(PLATFORM_CATALOG);

  return (
    <View>
      {platforms.map((platform) => {
        const isSelected = selected.includes(platform.id);
        return (
          <TouchableOpacity
            key={platform.id}
            style={[styles.row, isSelected && styles.rowSelected]}
            onPress={() => onToggle(platform.id)}
          >
            <View style={styles.checkbox}>{isSelected && <View style={styles.checkboxInner} />}</View>
            <View style={styles.textCol}>
              <Text style={styles.label}>{platform.label}</Text>
              <Text style={[styles.note, platform.mode === "one-click" ? styles.noteOneClick : styles.noteAssisted]}>
                {platform.mode === "one-click" ? "one-click · " : ""}
                {platform.note}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  rowSelected: {},
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#888",
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxInner: {
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: "#2563eb",
  },
  textCol: { flex: 1 },
  label: { fontSize: 15, fontWeight: "600", color: "#111" },
  note: { fontSize: 12, marginTop: 2 },
  noteOneClick: { color: "#16a34a" },
  noteAssisted: { color: "#b45309" },
});
