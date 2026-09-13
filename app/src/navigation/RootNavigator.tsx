import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { LoginScreen } from "../features/auth/LoginScreen";
import { useAuthStore } from "../state/authStore";

import { GoLiveSetupScreen } from "../features/live/GoLiveSetupScreen";
import { PropertyDetailScreen } from "../features/live/PropertyDetailScreen";
import { AddPropertyScreen } from "../features/live/AddPropertyScreen";
import { ConnectAccountsScreen } from "../features/live/ConnectAccountsScreen";
import { colors, radius } from "../theme";
import { LiveDashboardScreen } from "../features/live/LiveDashboardScreen";
import { BroadcastSummaryScreen } from "../features/live/BroadcastSummaryScreen";
import { ReportScreen } from "../features/report/ReportScreen";
import { ContactDetailScreen } from "../features/crm/ContactDetailScreen";
import { LiveStackParamList, ReportStackParamList, RootTabParamList } from "./types";

const LiveStack = createNativeStackNavigator<LiveStackParamList>();
const ReportStack = createNativeStackNavigator<ReportStackParamList>();
const Tab = createBottomTabNavigator<RootTabParamList>();

const headerStyles = StyleSheet.create({
  pill: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 4,
  },
  pillText: { color: colors.primaryDark, fontSize: 13, fontWeight: "700" },
});

const stackScreenOptions = {
  headerStyle: { backgroundColor: colors.surface },
  headerTitleStyle: { fontWeight: "700" as const },
  headerTintColor: colors.text,
  contentStyle: { backgroundColor: colors.bg },
};

function LiveStackNavigator() {
  return (
    <LiveStack.Navigator screenOptions={stackScreenOptions}>
      <LiveStack.Screen
        name="GoLiveSetup"
        component={GoLiveSetupScreen}
        options={({ navigation }) => ({
          title: "Listings",
          headerRight: () => (
            <TouchableOpacity
              onPress={() => navigation.navigate("ConnectAccounts")}
              style={headerStyles.pill}
            >
              <Text style={headerStyles.pillText}>Accounts</Text>
            </TouchableOpacity>
          ),
        })}
      />
      <LiveStack.Screen
        name="PropertyDetail"
        component={PropertyDetailScreen}
        options={{ title: "Property details", headerTintColor: colors.text }}
      />
      <LiveStack.Screen name="AddProperty" component={AddPropertyScreen} options={{ title: "Add property" }} />
      <LiveStack.Screen
        name="ConnectAccounts"
        component={ConnectAccountsScreen}
        options={{ title: "Connect Accounts" }}
      />
      <LiveStack.Screen name="LiveDashboard" component={LiveDashboardScreen} options={{ headerShown: false }} />
      <LiveStack.Screen
        name="BroadcastSummary"
        component={BroadcastSummaryScreen}
        options={{ title: "Summary", headerBackVisible: false }}
      />
    </LiveStack.Navigator>
  );
}

function ReportStackNavigator() {
  const signOut = useAuthStore((s) => s.signOut);
  return (
    <ReportStack.Navigator screenOptions={stackScreenOptions}>
      <ReportStack.Screen
        name="ReportHome"
        component={ReportScreen}
        options={{
          title: "Report",
          headerRight: () => (
            <TouchableOpacity onPress={() => signOut()} style={headerStyles.pill}>
              <Text style={headerStyles.pillText}>Sign out</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <ReportStack.Screen name="ContactDetail" component={ContactDetailScreen} options={{ title: "Contact" }} />
      <ReportStack.Screen name="BroadcastSummary" component={BroadcastSummaryScreen} options={{ title: "Summary" }} />
    </ReportStack.Navigator>
  );
}

export function RootNavigator() {
  const status = useAuthStore((s) => s.status);

  if (status === "loading") {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (status === "signedOut") {
    return <LoginScreen />;
  }

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            height: 74,
            paddingBottom: 12,
            paddingTop: 6,
          },
          tabBarLabelStyle: { fontSize: 12, fontWeight: "700" },
        }}
      >
        <Tab.Screen name="Live" component={LiveStackNavigator} options={{ tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 21 }}>⌂</Text> }} />
        <Tab.Screen name="Report" component={ReportStackNavigator} options={{ tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 21 }}>▤</Text> }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
