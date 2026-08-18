import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Text } from "react-native";

import { GoLiveSetupScreen } from "../features/live/GoLiveSetupScreen";
import { ConnectAccountsScreen } from "../features/live/ConnectAccountsScreen";
import { LiveDashboardScreen } from "../features/live/LiveDashboardScreen";
import { BroadcastSummaryScreen } from "../features/live/BroadcastSummaryScreen";
import { LeadListScreen } from "../features/crm/LeadListScreen";
import { ContactDetailScreen } from "../features/crm/ContactDetailScreen";
import { TaskListScreen } from "../features/crm/TaskListScreen";
import { LeadsStackParamList, LiveStackParamList, RootTabParamList } from "./types";

const LiveStack = createNativeStackNavigator<LiveStackParamList>();
const LeadsStack = createNativeStackNavigator<LeadsStackParamList>();
const Tab = createBottomTabNavigator<RootTabParamList>();

function LiveStackNavigator() {
  return (
    <LiveStack.Navigator>
      <LiveStack.Screen
        name="GoLiveSetup"
        component={GoLiveSetupScreen}
        options={({ navigation }) => ({
          title: "Go Live",
          headerRight: () => (
            <Text onPress={() => navigation.navigate("ConnectAccounts")} style={{ color: "#2563eb", fontSize: 14 }}>
              Accounts
            </Text>
          ),
        })}
      />
      <LiveStack.Screen
        name="ConnectAccounts"
        component={ConnectAccountsScreen}
        options={{ title: "Connect Accounts" }}
      />
      <LiveStack.Screen
        name="LiveDashboard"
        component={LiveDashboardScreen}
        options={{ headerShown: false }}
      />
      <LiveStack.Screen
        name="BroadcastSummary"
        component={BroadcastSummaryScreen}
        options={{ title: "Summary", headerBackVisible: false }}
      />
    </LiveStack.Navigator>
  );
}

function LeadsStackNavigator() {
  return (
    <LeadsStack.Navigator>
      <LeadsStack.Screen name="LeadList" component={LeadListScreen} options={{ title: "Leads" }} />
      <LeadsStack.Screen name="ContactDetail" component={ContactDetailScreen} options={{ title: "Contact" }} />
    </LeadsStack.Navigator>
  );
}

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator screenOptions={{ headerShown: false }}>
        <Tab.Screen
          name="Live"
          component={LiveStackNavigator}
          options={{ tabBarIcon: () => <Text>📡</Text> }}
        />
        <Tab.Screen
          name="Leads"
          component={LeadsStackNavigator}
          options={{ tabBarIcon: () => <Text>👤</Text> }}
        />
        <Tab.Screen
          name="Tasks"
          component={TaskListScreen}
          options={{ headerShown: true, title: "Tasks", tabBarIcon: () => <Text>✅</Text> }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
