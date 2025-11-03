import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Text } from "@/components/ui/text";
import {
    Cloud,
    Plane,
    ArrowLeft,
    ArrowLeftCircleIcon,
    StarIcon,
    HomeIcon,
    PlaneIcon,
    PlaneLandingIcon,
} from "lucide-react-native";
import { router } from "expo-router";
import { SafeAreaView, View, TouchableOpacity } from "react-native";
import { Button } from "@/components/ui/button";
import { SignInForm } from "@/components/sign-in-form";

const trips = [
    { label: "Summer Vacation to Hawaii", value: "hawaii" },
    { label: "Business Trip to New York", value: "nyc" },
    { label: "Weekend Getaway to Paris", value: "paris" },
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

function Stars() {
    const { width, height } = require("react-native").Dimensions.get("window");
    return (
        <>
            {starPositions.map((s, i) => {
                const left = Math.round(s.leftPct * width);
                const top = Math.round(s.topPct * height);
                const size = s.size;
                return (
                    <StarIcon
                        key={`star-${i}`}
                        color="white"
                        fill="white"
                        style={{
                            position: "absolute",
                            left,
                            top,
                            width: size,
                            height: size,
                            borderRadius: size / 2,
                            opacity: s.opacity,
                            zIndex: 0,
                        }}
                    />
                );
            })}
        </>
    );
}

export default function TripSelectionScreen() {
    return (
        <SafeAreaView className="flex-1 bg-background">
            <Stars />
            <View style={{ padding: 16 }}>
                <TouchableOpacity onPress={() => router.back()}>
                    <ArrowLeftCircleIcon size={24} color="white" />
                </TouchableOpacity>
            </View>
            <View
                style={{
                    position: "absolute",
                    top: 60,
                    left: 60,
                    opacity: 0.3,
                }}
            >
                <Cloud size={80} color="white" fill="white" />
            </View>
            <View
                style={{
                    position: "absolute",
                    top: 80,
                    left: 150,
                    opacity: 0.5,
                }}
            >
                <Plane size={40} color="white" fill="gray" />
            </View>
            <View
                style={{
                    position: "absolute",
                    top: 100,
                    right: 50,
                    opacity: 0.5,
                }}
            >
                <Cloud size={100} color="gray" fill="gray" />
            </View>

            {/* <View
                style={{
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                    paddingHorizontal: 24,
                }}
            >
                <Text className="text-2xl font-[JosefinSans-Bold] mb-4">
                    Welcome back, John Doe
                </Text>

                <Select>
                    <SelectTrigger className="w-full">
                        <SelectValue
                            className="text-muted-foreground"
                            placeholder="Select a trip"
                        />
                    </SelectTrigger>
                    <SelectContent>
                        {trips.map((trip) => (
                            <SelectItem
                                key={trip.value}
                                label={trip.label}
                                value={trip.value}
                            >
                                {trip.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Button
                    className="mt-10 font-bold flex flex-row items-center justify-center"
                    onPress={() => router.push("/(tabs)/home")}
                >
                    <PlaneLandingIcon color="white" className="mr-2" />
                    <Text>Let's Go!</Text>
                </Button>
            </View> */}

            <View className="absolute bg-black opacity-30 inset-0" />
            <View className="justify-end p-5 z-10">
                <SignInForm />
            </View>

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
