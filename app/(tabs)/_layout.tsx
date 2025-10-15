import { Tabs } from "expo-router";
import { ClipboardPlusIcon, FileScanIcon } from "lucide-react-native";

export default function TabsLayout() {
    return (
        <Tabs screenOptions={{ headerShown: true }}>
            <Tabs.Screen
                name="index"
                options={{
                    title: "Scan",
                    tabBarIcon: () => (
                        <ClipboardPlusIcon size={24} color="white" />
                    ),
                }}
            />
            <Tabs.Screen
                name="diagnostics"
                options={{
                    title: "Diagnostics",
                    tabBarIcon: () => <FileScanIcon size={24} color="white" />,
                }}
            />
        </Tabs>
    );
}
