import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { EngagementEvent, PLATFORM_CATALOG } from "../../../types/models";

interface Props {
  events: EngagementEvent[];
  onConvertToLead: (event: EngagementEvent) => void;
  onConvertToTask: (event: EngagementEvent) => void;
}

const FRESHNESS_LABEL: Record<EngagementEvent["freshness"], string> = {
  live: "🔴 live",
  delayed: "⏱ delayed",
  pending: "🕓 pending",
};

/**
 * Renders whatever freshness state the backend reports per event — the app
 * doesn't need to know *why* an event is delayed/pending, only display it.
 * See docs/05-api-research.md and docs/12-ux-wireframes.md §2.
 */
export function EngagementFeed({ events, onConvertToLead, onConvertToTask }: Props) {
  return (
    <View>
      {events.map((event) => {
        const platform = PLATFORM_CATALOG[event.platform];
        if (event.freshness === "pending") {
          return (
            <View key={event.id} style={styles.pendingRow}>
              <Text style={styles.freshness}>{FRESHNESS_LABEL[event.freshness]}</Text>
              <Text style={styles.platformLabel}>{platform.label}</Text>
              <Text style={styles.pendingText}>{event.text}</Text>
            </View>
          );
        }
        return (
          <View key={event.id} style={styles.card}>
            <View style={styles.headerRow}>
              <Text style={styles.freshness}>{FRESHNESS_LABEL[event.freshness]}</Text>
              <Text style={styles.platformLabel}>{platform.label}</Text>
            </View>
            <Text style={styles.author}>{event.authorName}</Text>
            <Text style={styles.text}>{event.text}</Text>
            <View style={styles.actionsRow}>
              {(event.intent === "viewing_request" || event.intent === "valuation_ask") && (
                <TouchableOpacity style={styles.actionBtn} onPress={() => onConvertToLead(event)}>
                  <Text style={styles.actionText}>Convert → Lead</Text>
                </TouchableOpacity>
              )}
              {event.intent === "question" && (
                <TouchableOpacity style={styles.actionBtn} onPress={() => onConvertToTask(event)}>
                  <Text style={styles.actionText}>Convert → Task</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  freshness: { fontSize: 11, color: "#64748b" },
  platformLabel: { fontSize: 11, color: "#64748b", fontWeight: "600" },
  author: { fontSize: 13, fontWeight: "700", color: "#111" },
  text: { fontSize: 14, color: "#1e293b", marginTop: 2 },
  actionsRow: { flexDirection: "row", marginTop: 8 },
  actionBtn: {
    backgroundColor: "#eff6ff",
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginRight: 8,
  },
  actionText: { color: "#2563eb", fontSize: 12, fontWeight: "600" },
  pendingRow: {
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    backgroundColor: "#fafafa",
  },
  pendingText: { fontSize: 12, color: "#94a3b8", fontStyle: "italic", marginTop: 2 },
});
