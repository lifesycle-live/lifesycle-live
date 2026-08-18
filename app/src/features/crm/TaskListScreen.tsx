import React from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getTasks, setTaskDone } from "../../api/tasks";
import { Task } from "../../types/models";

export function TaskListScreen() {
  const queryClient = useQueryClient();
  const { data: tasks, isLoading } = useQuery({ queryKey: ["tasks"], queryFn: getTasks });

  const toggleMutation = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) => setTaskDone(id, done),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  if (isLoading || !tasks) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <FlatList
      data={tasks}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: 12 }}
      renderItem={({ item }) => <TaskRow task={item} onToggle={toggleMutation.mutate} />}
    />
  );
}

function TaskRow({ task, onToggle }: { task: Task; onToggle: (args: { id: string; done: boolean }) => void }) {
  return (
    <TouchableOpacity style={styles.row} onPress={() => onToggle({ id: task.id, done: !task.done })}>
      <View style={[styles.checkbox, task.done && styles.checkboxDone]}>
        {task.done && <Text style={styles.checkmark}>✓</Text>}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, task.done && styles.titleDone]}>{task.title}</Text>
        {task.broadcastId && <Text style={styles.badge}>From live broadcast</Text>}
      </View>
    </TouchableOpacity>
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
  checkboxDone: { backgroundColor: "#16a34a", borderColor: "#16a34a" },
  checkmark: { color: "#fff", fontSize: 13, fontWeight: "700" },
  title: { fontSize: 14, color: "#111" },
  titleDone: { color: "#94a3b8", textDecorationLine: "line-through" },
  badge: { fontSize: 11, color: "#2563eb", marginTop: 2 },
});
