import {
    NativeSelectScrollView,
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Text } from "@/components/ui/text";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
    ArrowRight,
    Cloud,
    DollarSign,
    List,
    StarIcon,
} from "lucide-react-native";
import { SafeAreaView, View, TouchableOpacity } from "react-native";
import countryList from "country-list-js";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
} from "react-native-reanimated";
import ChinaLantern from "@/assets/images/china_lantern.svg";
import Colosseum from "@/assets/images/colosseum.svg";
import Lion from "@/assets/images/lion.svg";
import StatueOfLiberty from "@/assets/images/statue_of_liberty.svg";
import SouthDance from "@/assets/images/south_dance.svg";
import Boat from "@/assets/images/boat.svg";
import Penguin from "@/assets/images/penguin.svg";

interface Country {
    name: string;
    iso2: string;
    continent?: string;
    currency: {
        currencyCode: string;
    };
}

const continentGraphics: { [key: string]: React.FC<any> } = {
    Asia: ChinaLantern,
    Europe: Colosseum,
    Africa: Lion,
    "North America": StatueOfLiberty,
    "South America": SouthDance,
    Oceania: Boat,
    Antarctica: Penguin,
};

const locations = Object.values(countryList.all)
    .filter(
        (country: any): country is Country =>
            country.continent && country.currency
    )
    .map((country) => ({
        label: country.name,
        value: country.iso2,
        currency: country.currency,
        continent: country.continent,
        GraphicComponent: continentGraphics[country.continent!] || null,
    }));

const transactions = [
    { name: "Asbestos Seasoning", amount: "-$500" },
    { name: "Hotdog Thermometer", amount: "-$1200" },
    { name: "Large Mysterious Item", amount: "-$80" },
    { name: "Souvenirs", amount: "-$150" },
];

const starPositions = [
    { leftPct: 0.06, topPct: 0.08, size: 3, opacity: 0.9 },
    { leftPct: 0.18, topPct: 0.12, size: 2, opacity: 0.8 },
    { leftPct: 0.3, topPct: 0.06, size: 2.5, opacity: 0.85 },
    { leftPct: 0.44, topPct: 0.14, size: 2, opacity: 0.7 },
    { leftPct: 0.62, topPct: 0.1, size: 2.5, opacity: 0.9 },
    { leftPct: 0.78, topPct: 0.06, size: 2, opacity: 0.8 },
    { leftPct: 0.86, topPct: 0.18, size: 3, opacity: 0.95 },
    { leftPct: 0.12, topPct: 0.3, size: 1.8, opacity: 0.6 },
    { leftPct: 0.26, topPct: 0.28, size: 2.2, opacity: 0.7 },
    { leftPct: 0.52, topPct: 0.26, size: 1.6, opacity: 0.6 },
    { leftPct: 0.7, topPct: 0.32, size: 2, opacity: 0.7 },
    { leftPct: 0.92, topPct: 0.3, size: 1.5, opacity: 0.6 },
    { leftPct: 0.04, topPct: 0.7, size: 2, opacity: 0.5 },
    { leftPct: 0.22, topPct: 0.78, size: 1.6, opacity: 0.45 },
    { leftPct: 0.48, topPct: 0.74, size: 2.4, opacity: 0.55 },
    { leftPct: 0.66, topPct: 0.76, size: 1.8, opacity: 0.5 },
    { leftPct: 0.84, topPct: 0.72, size: 2, opacity: 0.6 },
];

const AnimatedStarIcon = Animated.createAnimatedComponent(StarIcon);

function AnimatedStar({ star }: { star: (typeof starPositions)[0] }) {
    const { width, height } = require("react-native").Dimensions.get("window");
    const opacity = useSharedValue(star.opacity);
    useEffect(() => {
        opacity.value = withRepeat(
            withSequence(
                withTiming(star.opacity * 0.5, {
                    duration: 1000 + Math.random() * 1000,
                }),
                withTiming(star.opacity, {
                    duration: 1000 + Math.random() * 1000,
                })
            ),
            -1,
            true
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            position: "absolute",
            left: Math.round(star.leftPct * width),
            top: Math.round(star.topPct * height),
            width: 20,
            height: 20,
            borderRadius: 10,
            opacity: opacity.value,
            zIndex: 0,
        };
    });

    return (
        <AnimatedStarIcon color="white" fill="white" style={animatedStyle} />
    );
}

function Stars() {
    return (
        <>
            {starPositions.map((s, i) => (
                <AnimatedStar key={`star-${i}`} star={s} />
            ))}
        </>
    );
}

export default function Home() {
    const locationRef = useRef(null);
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const contentInsets = {
        top: insets.top,
        bottom: insets.bottom,
        left: 12,
        right: 12,
    };

    return (
        <SafeAreaView className="flex-1 bg-background">
            <Stars />
            <View
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <View
                    style={{
                        width: 400,
                        height: 400,
                        borderRadius: 200,
                        backgroundColor: "rgba(118, 56, 247, 0.2)",
                        position: "absolute",
                    }}
                />
            </View>
            <View className="m-6 flex-1">
                <View className="flex-row justify-between items-center mb-4">
                    <Text className="text-4xl font-[JosefinSans-Bold]">
                        Hi, Eddie
                    </Text>
                </View>

                <View className="mb-4">
                    <Select>
                        <SelectTrigger className="w-full">
                            <SelectValue
                                className="text-muted-foreground"
                                placeholder="Select a location"
                            />
                        </SelectTrigger>
                        <SelectContent ref={locationRef} insets={contentInsets}>
                            <NativeSelectScrollView>
                                <SelectGroup>
                                    {locations.map((location) => (
                                        <SelectItem
                                            key={location.value}
                                            label={
                                                location.label +
                                                " (" +
                                                location.currency +
                                                ")"
                                            }
                                            value={location.value}
                                        ></SelectItem>
                                    ))}
                                </SelectGroup>
                            </NativeSelectScrollView>
                        </SelectContent>
                    </Select>
                </View>

                <Card className="mb-4">
                    <CardHeader>
                        <CardTitle>Budget</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <TouchableOpacity className="flex-row justify-between items-center" onPress={() => router.push('/finance')}>
                            <View className="flex-row items-center">
                                <DollarSign size={24} color="white" />
                                <Text className="text-xl ml-2">$5,000</Text>
                            </View>
                            <ArrowRight size={24} color="white" />
                        </TouchableOpacity>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Transactions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {transactions.map((transaction, index) => (
                            <View key={index}>
                                <View className="flex-row justify-between items-center py-2">
                                    <View className="flex-row items-center">
                                        <List size={24} color="white" />
                                        <Text className="ml-4">
                                            {transaction.name}
                                        </Text>
                                    </View>
                                    <Text>{transaction.amount}</Text>
                                </View>
                                {index < transactions.length - 1 && (
                                    <Separator />
                                )}
                            </View>
                        ))}
                    </CardContent>
                </Card>
            </View>
            {locationRef.current && (
                <View
                    style={{
                        position: "absolute",
                        top: 150,
                        left: 100,
                        opacity: 0.5,
                    }}
                >
                    <ChinaLantern
                        width={120}
                        height={120}
                        color="white"
                        fill="gray"
                    />
                </View>
            )}
            <View
                style={{
                    position: "absolute",
                    bottom: 50,
                    left: 50,
                    opacity: 1,
                }}
            >
                <Cloud height={120} width={150} color="white" fill="white" />
            </View>
            <View
                style={{
                    position: "absolute",
                    bottom: 80,
                    right: 50,
                    opacity: 0.5,
                }}
            >
                <Cloud size={90} color="white" fill="white" />
            </View>
        </SafeAreaView>
    );
}
