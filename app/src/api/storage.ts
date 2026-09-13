import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

/**
 * Cross-platform token storage. `expo-secure-store` has no web implementation
 * (its methods throw on web), which previously made every authed request
 * reject on the web build and left screens stuck on their loading spinner.
 * On web we fall back to localStorage; on native we keep SecureStore.
 */
export async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(key);
}

export async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* private mode / storage disabled */
    }
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === "web") {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
    return;
  }
  await SecureStore.deleteItemAsync(key);
}
