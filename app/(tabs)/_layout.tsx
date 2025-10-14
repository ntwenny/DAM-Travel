import { Tabs } from "expo-router";

export default function TabsLayout() {
    return (
        <Tabs screenOptions={{ headerShown: true }}>
            <Tabs.Screen name="index" options={{ title: "Scan" }} />
            <Tabs.Screen
                name="diagnostics"
                options={{ title: "Diagnostics" }}
            />
        </Tabs>
    );
}
