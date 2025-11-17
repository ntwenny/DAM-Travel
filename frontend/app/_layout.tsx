import "@/global.css";
import { Stack } from "expo-router";
import { PortalHost } from "@rn-primitives/portal";
import { ThemeProvider } from "@react-navigation/native";
import { NAV_THEME } from "@/theme";
import { colorScheme } from "nativewind";
import { CartProvider } from "@/context/cart-context";
import { ToastProvider } from "@/hooks/useToast";
export default function RootLayout() {
    colorScheme.set("dark");

    return (
        <CartProvider>
            <ToastProvider>
                <ThemeProvider value={NAV_THEME.dark}>
                    <Stack screenOptions={{ headerShown: false }}>
                        <Stack.Screen name="trip-selection" />
                        <Stack.Screen name="(tabs)" />
                        <Stack.Screen name="similar-products" />
                    </Stack>
                    <PortalHost />
                </ThemeProvider>
            </ToastProvider>
        </CartProvider>
    );
}
