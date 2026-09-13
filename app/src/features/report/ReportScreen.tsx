import React from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { getLeads } from "../../api/leads";
import { getTasks, setTaskDone } from "../../api/tasks";
import { QueryBoundary } from "../../components/QueryBoundary";
import { Lead, PLATFORM_CATALOG, Task } from "../../types/models";
import { useLiveSessionStore } from "../../state/liveSessionStore";
import { colors, radius, shadow } from "../../theme";
import type { ReportStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<ReportStackParamList, "ReportHome">;

const STATUS_COLOR: Record<Lead["status"], string> = {
  new: "#2563eb",
  contacted: "#b45309",
  qualified: "#7c3aed",
  won: "#16a34a",
  lost: "#94a3b8",
};

export function ReportScreen({ navigation }: Props) {
  const queryClient = useQueryClient();
  const activeBroadcast = useLiveSessionStore((s) => s.activeBroadcast);

  const leadsQuery = useQuery({ queryKey: ["leads"], queryFn: getLeads });
  const tasksQuery = useQuery({ queryKey: ["tasks"], queryFn: getTasks });

  const toggleTask = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) => setTaskDone(id, done),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const isLoading = leadsQuery.isLoading || tasksQuery.isLoading;
  const isError = leadsQuery.isError || tasksQuery.isError;

  if (isLoading || isError) {
    return (
      <QueryBoundary
        isLoading={isLoading}
        isError={isError}
        error={leadsQuery.error ?? tasksQuery.error}
        onRetry={() => {
          leadsQuery.refetch();
          tasksQuery.refetch();
        }}
      />
    );
  }

  const leads = leadsQuery.data ?? [];
  const tasks = tasksQuery.data ?? [];
  const openTasks = tasks.filter((t) => !t.done).length;

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={leadsQuery.isRefetching || tasksQuery.isRefetching}
          onRefresh={() => {
            leadsQuery.refetch();
            tasksQuery.refetch();
          }}
        />
      }
    >
      <Text style={styles.h1}>Report</Text>
      <Text style={styles.sub}>Everything captured from your broadcasts</Text>

      <View style={styles.statsRow}>
        <Stat label="Leads" value={String(leads.length)} />
        <Stat label="Open tasks" value={String(openTasks)} />
        <Stat label="Broadcasts" value={activeBroadcast ? "1" : "0"} />
      </View>

      {activeBroadcast ? (
        <TouchableOpacity
          style={[styles.card, shadow]}
          activeOpacity={0.85}
          onPress={() => navigation.navigate("BroadcastSummary", { broadcastId: activeBroadcast.id })}
        >
          <Text style={styles.cardKicker}>LATEST BROADCAST</Text>
          <Text style={styles.cardTitle}>{activeBroadcast.property.address}</Text>
          <Text style={styles.cardLink}>View full summary →</Text>
        </TouchableOpacity>
      ) : null}

      <Text style={styles.sectionLabel}>LEADS</Text>
      {leads.length === 0 ? (
        <Text style={styles.empty}>No leads yet — they appear here once a broadcast captures one.</Text>
      ) : (
        leads.map((lead) => (
          <TouchableOpacity
            key={lead.id}
            style={styles.row}
            onPress={() => navigation.navigate("ContactDetail", { contactId: lead.contact.id })}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{lead.contact.name}</Text>
              <Text style={styles.rowMeta}>
                {lead.source === "broadcast" && lead.sourcePlatform
                  ? `📡 ${PLATFORM_CATALOG[lead.sourcePlatform].label}`
                  : lead.source.replace("_", " ")}
              </Text>
            </View>
            <View style={[styles.pill, { backgroundColor: STATUS_COLOR[lead.status] }]}>
              <Text style={styles.pillText}>{lead.status}</Text>
            </View>
          </TouchableOpacity>
        ))
      )}

      <Text style={styles.sectionLabel}>TASKS</Text>
      {tasks.length === 0 ? (
        <Text style={styles.empty}>No tasks yet.</Text>
      ) : (
        tasks.map((task) => <TaskRow key={task.id} task={task} onToggle={toggleTask.mutate} />)
      )}
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={[styles.stat, shadow]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function TaskRow({
  task,
  onToggle,
}: {
  task: Task;
  onToggle: (args: { id: string; done: boolean }) => void;
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={() => onToggle({ id: task.id, done: !task.done })}>
      <View style={[styles.checkbox, task.done && styles.checkboxDone]}>
        {task.done ? <Text style={styles.checkmark}>✓</Text> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, task.done && styles.rowTitleDone]}>{task.title}</Text>
        {task.broadcastId ? <Text style={styles.rowMeta}>From live broadcast</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  h1: { fontSize: 26, fontWeight: "800", color: colors.text },
  sub: { fontSize: 14, color: colors.textMuted, marginTop: 2, marginBottom: 16 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 8 },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  statValue: { fontSize: 20, fontWeight: "800", color: colors.text },
  statLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 16,
    marginTop: 12,
  },
  cardKicker: { fontSize: 11, fontWeight: "800", color: colors.textMuted, letterSpacing: 0.5 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginTop: 4 },
  cardLink: { fontSize: 13, fontWeight: "700", color: colors.primary, marginTop: 8 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginTop: 24,
    marginBottom: 4,
  },
  empty: { fontSize: 13, color: colors.textMuted, marginTop: 6 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowTitle: { fontSize: 15, fontWeight: "600", color: colors.text },
  rowTitleDone: { color: colors.textMuted, textDecorationLine: "line-through" },
  rowMeta: { fontSize: 12, color: colors.textMuted, marginTop: 3 },
  pill: { borderRadius: radius.pill, paddingVertical: 4, paddingHorizontal: 10 },
  pillText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxDone: { backgroundColor: colors.success, borderColor: colors.success },
  checkmark: { color: "#fff", fontSize: 13, fontWeight: "700" },
});
