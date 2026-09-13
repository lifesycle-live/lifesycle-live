import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./src/state/queryClient";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { useAuthStore } from "./src/state/authStore";
import { MobileShell } from "./src/components/MobileShell";

export default function App() {
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <QueryClientProvider client={queryClient}>
      <MobileShell><RootNavigator /></MobileShell>
      <StatusBar style="auto" />
    </QueryClientProvider>
  );
}
