import React from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { getContact, getContactActivity } from "../../api/contacts";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ReportStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<ReportStackParamList, "ContactDetail">;

export function ContactDetailScreen({ route }: Props) {
  const { contactId } = route.params;

  const { data: contact, isLoading: contactLoading } = useQuery({
    queryKey: ["contact", contactId],
    queryFn: () => getContact(contactId),
  });
  const { data: activity, isLoading: activityLoading } = useQuery({
    queryKey: ["contact-activity", contactId],
    queryFn: () => getContactActivity(contactId),
  });

  if (contactLoading || !contact) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.name}>{contact.name}</Text>
      {contact.phone && <Text style={styles.meta}>{contact.phone}</Text>}
      {contact.email && <Text style={styles.meta}>{contact.email}</Text>}

      <Text style={styles.sectionLabel}>ACTIVITY</Text>
      {activityLoading ? (
        <ActivityIndicator />
      ) : activity && activity.length > 0 ? (
        activity.map((item) => (
          <View key={item.id} style={styles.activityRow}>
            <Text style={styles.activitySummary}>{item.summary}</Text>
            <Text style={styles.activityDate}>{new Date(item.createdAt).toLocaleString()}</Text>
          </View>
        ))
      ) : (
        <Text style={styles.empty}>No activity yet.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  name: { fontSize: 20, fontWeight: "700", color: "#111" },
  meta: { fontSize: 14, color: "#64748b", marginTop: 2 },
  sectionLabel: { fontSize: 12, fontWeight: "700", color: "#64748b", marginTop: 24, marginBottom: 8 },
  activityRow: { borderBottomWidth: 1, borderBottomColor: "#f1f5f9", paddingVertical: 10 },
  activitySummary: { fontSize: 14, color: "#1e293b" },
  activityDate: { fontSize: 11, color: "#94a3b8", marginTop: 2 },
  empty: { fontSize: 13, color: "#94a3b8" },
});
