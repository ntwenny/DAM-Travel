import { Image, ScrollView, View, ActivityIndicator } from "react-native";
import { Text } from "@/components/ui/text";
import SettingRow from "@/components/ui/setting-row";
import { SafeAreaView } from "react-native-safe-area-context";
import { useUser } from "@/hooks/useUser";
import React, { useMemo, memo } from "react";
import { getCurrencySymbol } from "@/lib/utils";

const clouds = require("@/assets/images/profile-clouds.png");
const defaultAvatar = require("@/assets/images/profile-placeholder.png");

function Profile() {
    const { user, userProfile } = useUser();

    // Calculate dynamic stats from user profile
    const stats = useMemo(() => {
        const trips = userProfile?.trips || [];
        const tripCount = trips.length;

        // Calculate total budget spent across all trips (simplified - would need actual finance data)
        const totalBudget = trips.reduce(
            (sum, trip) => sum + (trip.finance?.budget || 0),
            0
        );
        console.log(trips);
        console.log(totalBudget);
        // Get home currency symbol
        const homeCountry = userProfile?.homeCountry || "US";
        const currencyMap: Record<string, string> = {
            US: "USD",
            FR: "EUR",
            GB: "GBP",
            JP: "JPY",
            CA: "CAD",
            AU: "AUD",
            CN: "CNY",
            IN: "INR",
            KR: "KRW",
        };
        const currencyCode = currencyMap[homeCountry] || "USD";
        const currencySymbol = getCurrencySymbol(currencyCode);

        return [
            { label: "TRIPS", value: String(tripCount) },
            {
                label: "COUNTRIES",
                value: String(new Set(trips.map((t) => t.location)).size),
            },
            {
                label: "BUDGET",
                value: `${currencySymbol}${totalBudget.toLocaleString()}`,
            },
        ];
    }, [userProfile]);

    // Get display name and email
    const displayName =
        user?.displayName || userProfile?.displayName || "Traveler";
    const email = user?.email || userProfile?.email || "";
    const photoURL = user?.photoURL || userProfile?.photoURL;

    if (!user) {
        return (
            <View className="flex-1 bg-white items-center justify-center">
                <ActivityIndicator size="large" color="#00a0d6" />
                <Text className="mt-4 text-gray-500">Loading profile...</Text>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-white">
            <SafeAreaView className="flex-1">
                <Image
                    source={clouds}
                    className="absolute left-[-80] top-0 h-40 w-[360] opacity-80"
                    resizeMode="contain"
                />
                <Image
                    source={clouds}
                    className="absolute right-[-120] top-100 h-36 w-[360] opacity-70"
                    resizeMode="contain"
                />
                <Image
                    source={clouds}
                    className="absolute left-[-60] bottom-32 h-40 w-[360] opacity-65"
                    resizeMode="contain"
                />
                <ScrollView contentContainerClassName="pb-12 px-5">
                    <View className="mt-6 items-center">
                        <View className="relative mb-6">
                            <View className="absolute inset-0 rounded-full bg-white/80 blur-2xl" />
                            <Image
                                source={
                                    photoURL ? { uri: photoURL } : defaultAvatar
                                }
                                className="h-32 w-32 rounded-full border-[8px] border-[#f5fbff]"
                                resizeMode="cover"
                            />
                        </View>
                        <Text className="text-3xl font-semibold text-[#0d2645]">
                            {displayName}
                        </Text>
                        <Text className="text-sm text-[#0d2645]/70">
                            {email}
                        </Text>
                    </View>

                    <View className="mt-6 rounded-3xl border-4 border-[#86b7df] bg-[#e7f4ff] px-3 py-4">
                        <View className="flex-row gap-3">
                            {stats.map((stat) => (
                                <View
                                    key={stat.label}
                                    className="basis-0 flex-1 items-center rounded-2xl bg-[#60b0de] px-3 py-4 shadow-md shadow-[#4981a8]/40"
                                >
                                    <Text
                                        className="text-2xl font-bold text-white"
                                        numberOfLines={1}
                                        adjustsFontSizeToFit
                                        minimumFontScale={0.6}
                                    >
                                        {stat.value}
                                    </Text>
                                    <Text className="text-xs font-semibold uppercase tracking-wide text-white">
                                        {stat.label}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </View>

                    <View className="mt-8 flex-col gap-3">
                        <SettingRow
                            label="Edit Account"
                            icon="person"
                            variant="primary"
                            pillColor="#00a0d6"
                            textColor="#ffffff"
                        />
                        <SettingRow
                            label="App Settings"
                            icon="settings"
                            variant="primary"
                            pillColor="#00a0d6"
                            textColor="#ffffff"
                        />
                        <SettingRow
                            label="Payment Methods"
                            icon="card"
                            variant="primary"
                            pillColor="#00a0d6"
                            textColor="#ffffff"
                        />
                        <SettingRow
                            label="Help Center"
                            icon="help-circle"
                            variant="primary"
                            pillColor="#00a0d6"
                            textColor="#ffffff"
                        />
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

export default memo(Profile);
