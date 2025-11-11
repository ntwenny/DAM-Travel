import { Tabs } from "expo-router";
import {
    HomeIcon,
    MaximizeIcon,
    ShoppingBagIcon,
    DollarSignIcon,
    UserIcon,
    CameraIcon,
    SheetIcon,
} from "lucide-react-native";
import { View } from "react-native";
import { setLastTabRoute } from "@/lib/navigation-state";

export default function TabsLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: true,
                headerStyle: {
                    backgroundColor: "#18181B",
                },
                tabBarShowLabel: false,
                tabBarStyle: {
                    backgroundColor: "#18181B",
                    borderTopWidth: 0,
                },
                tabBarActiveTintColor: "white",
                tabBarInactiveTintColor: "gray",
            }}
            screenListeners={({ route }) => ({
                focus: () => {
                    if (route.name !== "index") {
                        setLastTabRoute(route.name);
                    }
                },
            })}
        >
            <Tabs.Screen
                name="home"
                options={{
                    title: "Home",
                    tabBarIcon: ({ color }) => (
                        <HomeIcon size={24} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="expand"
                options={{
                    title: "Expand",
                    tabBarIcon: ({ color }) => (
                        <MaximizeIcon size={24} color={color} />
                    ),
                }}
            />
            {/* <Tabs.Screen
                name="bag"
                options={{
                    title: "Bag",
                    tabBarIcon: ({ color }) => (
                        <ShoppingBagIcon size={24} color={color} />
                    ),
                }}
            /> */}

            <Tabs.Screen
                name="finance"
                options={{
                    title: "Finance",
                    tabBarIcon: ({ color }) => (
                        <DollarSignIcon size={24} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="index"
                options={{
                    title: "Camera",
                    headerShown: false,
                    tabBarStyle: { display: "none" },
                    tabBarIcon: () => (
                        <View className="border-muted border-2 rounded-full elevation-lg -translate-y-2 p-4 bg-foreground ">
                            <CameraIcon size={28} color="black" />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: "Profile",
                    tabBarIcon: ({ color }) => (
                        <UserIcon size={24} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="diagnostics"
                options={{
                    title: "Diagnostics",
                    tabBarIcon: ({ color }) => (
                        <SheetIcon size={24} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
