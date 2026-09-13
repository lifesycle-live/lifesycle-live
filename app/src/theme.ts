import { Platform, ViewStyle } from "react-native";

/** Small shared design tokens so screens stay visually consistent. */
export const colors = {
  bg: "#fff8fa",
  surface: "#ffffff",
  border: "#f1dfe7",
  text: "#362832",
  textMuted: "#876d7a",
  primary: "#dc568c",
  primarySoft: "#fce7f3",
  primaryDark: "#be185d",
  live: "#dc2626",
  success: "#16a34a",
  warning: "#b45309",
};

export const radius = { sm: 10, md: 16, lg: 24, pill: 999 };

export const buttonSm: ViewStyle = {
  paddingVertical: 8,
  paddingHorizontal: 14,
  borderRadius: radius.pill,
  alignItems: "center",
  justifyContent: "center",
};

export const shadow: ViewStyle = Platform.select({
  ios: {
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  android: { elevation: 3 },
  default: {
    // react-native-web
    boxShadow: "0 4px 12px rgba(15,23,42,0.08)",
  } as ViewStyle,
}) as ViewStyle;
