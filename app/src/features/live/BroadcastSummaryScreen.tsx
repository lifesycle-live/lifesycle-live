import React from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { getBroadcastSummary } from "../../api/broadcasts";
import { QueryBoundary } from "../../components/QueryBoundary";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { LiveStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<LiveStackParamList, "BroadcastSummary">;

export function BroadcastSummaryScreen({ route, navigation }: Props) {
  const { broadcastId } = route.params;
  const { data: summary, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["broadcast-summary", broadcastId],
    queryFn: () => getBroadcastSummary(broadcastId),
  });

  if (isLoading || isError || !summary) {
    return (
      <QueryBoundary isLoading={isLoading} isError={isError} error={error} onRetry={refetch} />
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <View style={styles.statsRow}>
        <Stat label="Peak viewers" value={String(summary.peakViewers)} icon="👁" />
        <Stat label="Comments" value={String(summary.commentCount)} icon="💬" />
        <Stat label="Leads captured" value={String(summary.leadsCreated)} icon="✅" />
      </View>

      <Text style={styles.sectionLabel}>HIGHLIGHT CLIPS (auto-generated)</Text>
      <View style={styles.clipsRow}>
        {summary.highlightClips.map((clip) => (
          <View key={clip.id} style={styles.clipChip}>
            <Text style={styles.clipText}>
              ▶ {clip.durationSeconds}s {clip.label}
            </Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.linkRow}>
        <Text style={styles.link}>View full transcript</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.linkRow}>
        <Text style={styles.link}>Download recording</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.doneButton}
        onPress={() => navigation.popToTop()}
      >
        <Text style={styles.doneButtonText}>Done</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>
        {icon} {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  statsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  stat: { alignItems: "center" },
  statValue: { fontSize: 16, fontWeight: "700", color: "#111" },
  statLabel: { fontSize: 11, color: "#64748b", marginTop: 2 },
  sectionLabel: { fontSize: 12, fontWeight: "700", color: "#64748b", marginBottom: 8 },
  clipsRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 20 },
  clipChip: {
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  clipText: { fontSize: 12, color: "#334155" },
  linkRow: { paddingVertical: 10 },
  link: { color: "#2563eb", fontWeight: "600", fontSize: 14 },
  doneButton: {
    backgroundColor: "#2563eb",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 24,
  },
  doneButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
