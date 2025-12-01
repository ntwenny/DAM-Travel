import { Tabs } from "expo-router";
import {
    HomeIcon,
    ShoppingBagIcon,
    DollarSignIcon,
    UserIcon,
    CameraIcon,
} from "lucide-react-native";
import { View } from "react-native";

export default function TabsLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                headerStyle: {
                    backgroundColor: "#18181B",
                },
                tabBarShowLabel: false,
                tabBarStyle: {
                    backgroundColor: "#ffffffff",
                    borderTopWidth: 0,
                },
                tabBarActiveTintColor: "black",
                tabBarInactiveTintColor: "gray",
            }}
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
                name="cart"
                options={{
                    title: "Cart",
                    tabBarIcon: ({ color }) => (
                        <ShoppingBagIcon size={24} color={color} />
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
                        <View className="border border-white rounded-full elevation-lg -translate-y-2 p-4 bg-secondary">
                            <CameraIcon size={28} color="white" />
                        </View>
                    ),
                }}
            />
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
                name="profile"
                options={{
                    title: "Profile",
                    tabBarIcon: ({ color }) => (
                        <UserIcon size={24} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
