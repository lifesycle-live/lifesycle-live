import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { EngagementEvent } from "../../../types/models";

interface Props {
  events: EngagementEvent[];
  onAction: (event: EngagementEvent) => void;
  onDismiss: (event: EngagementEvent) => void;
}

const INTENT_LABEL: Record<string, string> = {
  viewing_request: "viewing request",
  valuation_ask: "valuation interest",
  question: "question",
};

/** High-intent items surfaced above the raw feed. See docs/12-ux-wireframes.md §2. */
export function PriorityQueue({ events, onAction, onDismiss }: Props) {
  const highIntent = events.filter(
    (e) => e.intent === "viewing_request" || e.intent === "valuation_ask",
  );

  if (highIntent.length === 0) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>PRIORITY QUEUE (AI-flagged high intent)</Text>
      {highIntent.map((event) => (
        <View key={event.id} style={styles.row}>
          <Text style={styles.rowText}>
            {event.authorName} — {INTENT_LABEL[event.intent] ?? event.intent}
          </Text>
          <View style={styles.buttons}>
            <TouchableOpacity onPress={() => onAction(event)}>
              <Text style={styles.actionLink}>Book viewing</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onDismiss(event)}>
              <Text style={styles.dismissLink}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#fefce8", borderRadius: 10, padding: 12, marginTop: 12 },
  title: { fontSize: 11, fontWeight: "700", color: "#854d0e", marginBottom: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  rowText: { fontSize: 13, color: "#111", flex: 1 },
  buttons: { flexDirection: "row", gap: 12 },
  actionLink: { color: "#2563eb", fontSize: 12, fontWeight: "600", marginRight: 12 },
  dismissLink: { color: "#94a3b8", fontSize: 12 },
});
