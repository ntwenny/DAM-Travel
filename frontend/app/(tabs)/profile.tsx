import { Image, ScrollView, View } from "react-native";
import { Text } from "@/components/ui/text";
import SettingRow from "@/components/ui/setting-row";
import { SafeAreaView } from "react-native-safe-area-context";

const user = {
    name: "LeBron James",
    email: "nathanisthegoat@goat.com",
    avatar: "https://i.ytimg.com/vi/NhHb9usKy6Q/maxresdefault.jpg",
    stats: [
        { label: "Trips", value: "67" },
        { label: "Miles", value: "41k" },
        { label: "Money Saved", value: "$420.69" },
    ],
};

export default function Profile() {
    return (
        <View className="flex-1 bg-slate-950">
            <SafeAreaView className="flex-1">
                <ScrollView
                    contentContainerClassName="px-5 pb-12"
                    nestedScrollEnabled
                >
                    <View className="mt-8 items-center rounded-3xl border border-white/10 bg-white/5 p-6">
                        <Image
                            source={{ uri: user.avatar }}
                            style={{
                                width: 96,
                                height: 96,
                                borderRadius: 48,
                                borderWidth: 3,
                                borderColor: "#ffffff30",
                                marginBottom: 16,
                            }}
                        />
                        <Text className="text-2xl font-semibold text-white">
                            {user.name}
                        </Text>
                        <Text className="text-sm text-white/70">
                            {user.email}
                        </Text>

                    <View className="mt-6 flex-row items-center justify-between gap-3">
                        {user.stats.map((stat) => (
                            <View
                                key={stat.label}
                                className="basis-0 flex-1 rounded-2xl bg-white/10 px-4 py-3"
                            >
                                <Text
                                    className="text-lg font-bold text-white"
                                    numberOfLines={1}
                                    adjustsFontSizeToFit
                                    minimumFontScale={0.6}
                                >
                                    {stat.value}
                                </Text>
                                <Text className="text-xs uppercase tracking-wide text-white/60">
                                    {stat.label}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </View>

                    <View className="mt-8 rounded-3xl border border-white/5 bg-white p-5 shadow-2xl shadow-black/40">
                        <Text className="text-lg font-semibold text-slate-900">
                            Settings
                        </Text>
                        <ScrollView className="mt-4" nestedScrollEnabled>
                            <View className="gap-3 pb-2">
                                <SettingRow
                                    label="Account"
                                    description="Profile, passwords, language"
                                    icon="person"
                                />
                                <SettingRow
                                    label="Notifications"
                                    description="Email & push alerts"
                                    icon="notifications"
                                />
                                <SettingRow
                                    label="Privacy"
                                    description="Permissions & data"
                                    icon="lock-closed"
                                />
                                <SettingRow
                                    label="Travel Preferences"
                                    description="Airlines, seating, meals"
                                    icon="airplane"
                                />
                                <SettingRow
                                    label="Payment Methods"
                                    description="Cards & billing"
                                    icon="card"
                                />
                                <SettingRow
                                    label="Security"
                                    description="2FA, trusted devices"
                                    icon="shield-checkmark"
                                />
                            </View>
                        </ScrollView>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
