import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { PLATFORM_CATALOG, PlatformId, PlatformInfo } from "../../../types/models";
import { colors, radius } from "../../../theme";

interface Props {
  selected: PlatformId[];
  onToggle: (platform: PlatformId) => void;
  /** Platforms this agent has actually connected (via Connect Accounts). */
  connectedPlatforms: PlatformId[];
  /** Called when the agent taps a one-click platform they haven't connected yet. */
  onRequestConnect?: (platform: PlatformId) => void;
}

/**
 * Each platform is a compact chip. Selection is shown with the app's pink
 * accent (not each platform's raw brand color) so the row stays visually
 * calm; a small brand-colored dot keeps the platform recognizable. Still
 * labels the real mechanism (one-click vs. assisted) per
 * docs/04-technical-feasibility.md.
 *
 * One-click platforms only toggle if the agent has connected that account —
 * `routes/broadcasts.ts` fails the *entire* broadcast if a selected platform
 * has no resolvable connection, so gating here prevents a guaranteed error.
 * Assisted platforms never go through `adapter.publish()` at all (no
 * adapter is registered for them) — they're shown as informational chips,
 * not part of the go-live selection.
 */
export function PlatformSelector({ selected, onToggle, connectedPlatforms, onRequestConnect }: Props) {
  const ordered = Object.values(PLATFORM_CATALOG).sort((a, b) => Number(connectedPlatforms.includes(b.id)) - Number(connectedPlatforms.includes(a.id)));
  const oneClick = ordered.filter((p) => p.mode === "one-click");
  const manual = ordered.filter((p) => p.mode === "manual");
  const assisted = ordered.filter((p) => p.mode === "assisted");

  return (
    <View>
      <Group
        title="One-click — we start the stream"
        platforms={oneClick}
        selected={selected}
        connectedPlatforms={connectedPlatforms}
        onToggle={onToggle}
        onRequestConnect={onRequestConnect}
      />
      {manual.length > 0 && (
        <Group
          title="You paste the key — we send the camera"
          platforms={manual}
          selected={selected}
          connectedPlatforms={connectedPlatforms}
          onToggle={onToggle}
          onRequestConnect={onRequestConnect}
        />
      )}
      <AssistedGroup title="Other connected accounts · separate broadcast setup" platforms={assisted} connectedPlatforms={connectedPlatforms} />
    </View>
  );
}

function Group({
  title,
  platforms,
  selected,
  connectedPlatforms,
  onToggle,
  onRequestConnect,
}: {
  title: string;
  platforms: PlatformInfo[];
  selected: PlatformId[];
} & Pick<Props, "connectedPlatforms" | "onToggle" | "onRequestConnect">) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.groupTitle}>{title}</Text>
      <View style={styles.chipRow}>
        {platforms.map((platform) => {
          const isConnected = connectedPlatforms.includes(platform.id);
          const isSelected = isConnected && selected.includes(platform.id);
          return (
            <TouchableOpacity
              key={platform.id}
              activeOpacity={0.8}
              onPress={() => (isConnected ? onToggle(platform.id) : onRequestConnect?.(platform.id))}
              style={[styles.chip, isSelected && styles.chipSelected, !isConnected && styles.chipDisabled]}
            >
              <View style={[styles.dot, { backgroundColor: platform.color }]} />
              <Text style={[styles.chipLabel, isSelected && styles.chipLabelSelected]}>{platform.label}</Text>
              <Text style={[styles.check, isSelected && styles.checkSelected]}>{isSelected ? "✓" : "+"}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function AssistedGroup({
  title,
  platforms,
  connectedPlatforms,
}: {
  title: string;
  platforms: PlatformInfo[];
  connectedPlatforms: PlatformId[];
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.groupTitle}>{title}</Text>
      <View style={{ gap: 8 }}>
        {platforms.map((platform) => {
          const isConnected = connectedPlatforms.includes(platform.id);
          return (
            <View key={platform.id} style={[styles.chip, styles.chipInfo, styles.assistedRow]}>
              <View style={styles.assistedHeader}>
                <View style={[styles.dot, { backgroundColor: platform.color }]} />
                <Text style={styles.chipLabel}>{platform.label}</Text>
                <Text style={styles.infoTag}>{isConnected ? "Linked" : "Not linked"}</Text>
              </View>
              {/* The catalog note is the honest per-platform reason this is not
                  one-click (no Live API, scheduling rules, ...) — see
                  docs/04-technical-feasibility.md. A generic "setup needed"
                  read as something the agent could fix. */}
              <Text style={styles.assistedNote}>{isConnected ? platform.note : "Connect from the accounts screen"}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  groupTitle: { fontSize: 12, fontWeight: "700", color: colors.textMuted, marginBottom: 8 },
  assistedRow: { flexDirection: "column", alignItems: "stretch", gap: 4 },
  assistedHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  assistedNote: { fontSize: 11, color: colors.textMuted, lineHeight: 15 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipDisabled: { opacity: 0.45 },
  chipInfo: { opacity: 0.85 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  chipLabel: { fontSize: 13, fontWeight: "700", color: colors.text },
  chipLabelSelected: { color: "#fff" },
  check: { fontSize: 13, fontWeight: "800", color: colors.textMuted, marginLeft: 2 },
  checkSelected: { color: "#fff" },
  infoTag: { fontSize: 12, fontWeight: "700", color: colors.textMuted, marginLeft: 2 },
});
