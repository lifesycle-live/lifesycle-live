import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { AiPrepSuggestions } from "../../../api/broadcasts";
import { colors, radius } from "../../../theme";

interface Props {
  isLoading: boolean;
  prep?: AiPrepSuggestions;
}

/** See docs/10-ai-features.md "Before the broadcast". */
export function AiPrepPanel({ isLoading, prep }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>✨ AI PREP</Text>
      {isLoading || !prep ? (
        <ActivityIndicator style={{ marginVertical: 12 }} />
      ) : (
        <>
          {prep.talkingPoints.map((point) => (
            <Text key={point} style={styles.point}>
              •  {point}
            </Text>
          ))}
          {prep.promoCopy ? <Text style={styles.promo}>“{prep.promoCopy}”</Text> : null}
          {prep.suggestedStartTime ? (
            <Text style={styles.suggestion}>Suggested time: {prep.suggestedStartTime}</Text>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#eef2ff",
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 18,
  },
  title: { fontSize: 12, fontWeight: "800", color: colors.primary, marginBottom: 8, letterSpacing: 0.5 },
  point: { fontSize: 14, color: colors.text, marginBottom: 4, lineHeight: 20 },
  promo: { fontSize: 13, color: colors.text, marginTop: 10, fontStyle: "italic" },
  suggestion: { fontSize: 13, color: colors.textMuted, marginTop: 8 },
});
