import React from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { getLeads } from "../../api/leads";
import { Lead, PLATFORM_CATALOG } from "../../types/models";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { LeadsStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<LeadsStackParamList, "LeadList">;

const STATUS_COLOR: Record<Lead["status"], string> = {
  new: "#2563eb",
  contacted: "#b45309",
  qualified: "#7c3aed",
  won: "#16a34a",
  lost: "#94a3b8",
};

export function LeadListScreen({ navigation }: Props) {
  const { data: leads, isLoading } = useQuery({ queryKey: ["leads"], queryFn: getLeads });

  if (isLoading || !leads) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <FlatList
      data={leads}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: 12 }}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.row}
          onPress={() => navigation.navigate("ContactDetail", { contactId: item.contact.id })}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.contact.name}</Text>
            <View style={styles.sourceRow}>
              {item.source === "broadcast" && item.sourcePlatform ? (
                <View style={styles.sourceBadge}>
                  <Text style={styles.sourceBadgeText}>
                    📡 {PLATFORM_CATALOG[item.sourcePlatform].label}
                  </Text>
                </View>
              ) : (
                <Text style={styles.sourceText}>{item.source.replace("_", " ")}</Text>
              )}
            </View>
          </View>
          <View style={[styles.statusPill, { backgroundColor: STATUS_COLOR[item.status] }]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  name: { fontSize: 15, fontWeight: "600", color: "#111" },
  sourceRow: { marginTop: 4 },
  sourceBadge: {
    backgroundColor: "#eff6ff",
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 6,
    alignSelf: "flex-start",
  },
  sourceBadgeText: { fontSize: 11, color: "#2563eb", fontWeight: "600" },
  sourceText: { fontSize: 12, color: "#94a3b8" },
  statusPill: { borderRadius: 12, paddingVertical: 4, paddingHorizontal: 10 },
  statusText: { color: "#fff", fontSize: 11, fontWeight: "700" },
});
