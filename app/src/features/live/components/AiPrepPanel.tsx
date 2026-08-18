import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { AiPrepSuggestions } from "../../../api/broadcasts";

interface Props {
  isLoading: boolean;
  prep?: AiPrepSuggestions;
}

/** See docs/10-ai-features.md "Before the broadcast". */
export function AiPrepPanel({ isLoading, prep }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>AI PREP</Text>
      {isLoading || !prep ? (
        <ActivityIndicator style={{ marginVertical: 12 }} />
      ) : (
        <>
          {prep.talkingPoints.map((point) => (
            <Text key={point} style={styles.point}>
              • {point}
            </Text>
          ))}
          {prep.suggestedStartTime && (
            <Text style={styles.suggestion}>Suggested time: {prep.suggestedStartTime}</Text>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  title: { fontSize: 12, fontWeight: "700", color: "#64748b", marginBottom: 8, letterSpacing: 0.5 },
  point: { fontSize: 14, color: "#1e293b", marginBottom: 4 },
  suggestion: { fontSize: 13, color: "#475569", marginTop: 8, fontStyle: "italic" },
});
