import "@/global.css";
import { Stack } from "expo-router";
import { PortalHost } from "@rn-primitives/portal";
import { ThemeProvider } from "@react-navigation/native";
import { NAV_THEME } from "@/theme";
import { colorScheme } from "nativewind";
import TripSelectionScreen from "./trip-selection";
import SimilarProductsScreen from "./similar-products";
export default function RootLayout() {
    colorScheme.set("dark");

    return (
        <ThemeProvider value={NAV_THEME.dark}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="trip-selection" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="similar-products" />
        </Stack>
        <PortalHost />
        </ThemeProvider>
    );
}
