import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    type Option as SelectOption,
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    SafeAreaView,
    View,
    TouchableOpacity,
    Modal,
    TextInput,
    ActivityIndicator,
    ScrollView as RNScrollView,
} from "react-native";
import { Button } from "@/components/ui/button";
import { SignInForm } from "@/components/sign-in-form";
import { useState, useEffect, useCallback } from "react";
import { SignUpForm } from "@/components/sign-up-form";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
} from "react-native-reanimated";
import { FirebaseError } from "firebase/app";
import type { User } from "firebase/auth";
import {
    createTrip,
    getTrips,
    observeAuthState,
    signInWithEmail,
    signUpWithEmail,
    setCurrentTrip,
} from "../lib/firebase";
import countryList from "country-list-js";

interface Country {
    name: string;
    iso2: string;
    continent?: string;
    currency: {
        currencyCode: string;
    };
}

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
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

type TripOption = NonNullable<SelectOption>;

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

export default function TripSelectionScreen() {
    const [tabState, setTabState] = useState<"sign-in" | "sign-up">("sign-in");
    const [user, setUser] = useState<User | null>(null);
    const [authReady, setAuthReady] = useState(false);
    const [authBusy, setAuthBusy] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);
    const [tripsState, setTripsState] = useState<TripOption[]>([]);
    const [tripsError, setTripsError] = useState<string | null>(null);
    const [loadingTrips, setLoadingTrips] = useState(false);
    const [selectedTrip, setSelectedTrip] = useState<TripOption | undefined>();
    const [createVisible, setCreateVisible] = useState(false);
    const [creatingTrip, setCreatingTrip] = useState(false);
    const [newTripName, setNewTripName] = useState("");
    const [newTripDestination, setNewTripDestination] = useState("");
    const [destinationSearch, setDestinationSearch] = useState("");
    const [isSigningUp, setIsSigningUp] = useState(false);

    const loadTrips = useCallback(async () => {
        setLoadingTrips(true);
        setTripsError(null);
        try {
            const trips = await getTrips();
            const list: TripOption[] = (trips || []).map((t: any) => ({
                label: t.name || "Untitled",
                value: t.id,
            }));
            setTripsState(list);
            setSelectedTrip(
                (prev) =>
                    list.find(
                        (item) => item && prev && item.value === prev.value
                    ) ?? list[0]
            );
        } catch (err) {
            console.error("Failed to load trips", err);
            setTripsError(
                "We couldn't load your trips. Try again in a moment."
            );
            setTripsState([]);
            setSelectedTrip(undefined);
        } finally {
            setLoadingTrips(false);
        }
    }, []);

    useEffect(() => {
        const unsubscribe = observeAuthState((current) => {
            setUser(current);
            setAuthReady(true);
            if (current) {
                // When a user is available, load their trips.
                loadTrips();
            } else {
                // Clear trip data when the user signs out.
                setTripsState([]);
                setSelectedTrip(undefined);
                setLoadingTrips(false);
            }
        });
        return unsubscribe;
    }, [loadTrips]);

    const handleSignIn = useCallback(
        async (email: string, password: string) => {
            setAuthBusy(true);
            setAuthError(null);
            try {
                await signInWithEmail(email, password);
            } catch (err) {
                console.error("Sign in failed", err);
                setAuthError(authErrorMessage(err));
            } finally {
                setAuthBusy(false);
            }
        },
        []
    );

    const handleSignUp = useCallback(
        async (email: string, password: string) => {
            setAuthBusy(true);
            setAuthError(null);
            setIsSigningUp(true);
            try {
                await signUpWithEmail(email, password);
                // The `observeAuthState` listener will handle the post-signup flow.
            } catch (err) {
                console.error("Sign up failed", err);
                setAuthError(authErrorMessage(err));
                setIsSigningUp(false); // Reset on failure
            } finally {
                setAuthBusy(false);
            }
        },
        []
    );

    const handleCreateTrip = useCallback(async () => {
        const trimmedName = newTripName.trim();
        if (!trimmedName) {
            setTripsError("Trip name cannot be empty.");
            return;
        }
        setCreatingTrip(true);
        setTripsError(null);
        if (!newTripDestination) {
            setTripsError("Destination is required.");
            setCreatingTrip(false);
            return;
        }
        const selectedLocation = locations.find((l) => l.value === newTripDestination);
        const tripCurrency = selectedLocation?.currency?.currencyCode || "USD";
        try {
            await createTrip({ 
                name: trimmedName,
                location: newTripDestination,
                currency: tripCurrency,
            });
            setCreateVisible(false);
            setNewTripName("");
            setNewTripDestination("");
            await loadTrips();
        } catch (err) {
            console.error("Failed to create trip", err);
            setTripsError(
                (err as Error)?.message ||
                    "We couldn't create that trip just yet."
            );
        } finally {
            setCreatingTrip(false);
        }
    }, [loadTrips, newTripName, newTripDestination]);

    const isSignedIn = Boolean(user);
    const displayName = user?.displayName || user?.email || "Traveler";
    const [settingTrip, setSettingTrip] = useState(false);
    const disablePrimaryAction =
        loadingTrips ||
        settingTrip ||
        !selectedTrip?.value ||
        tripsError !== null;

    const showAuthOverlay = authReady && !isSignedIn;
    const showAuthForm = authReady && !isSignedIn && !isSigningUp;

    function handleTabChange(next: string) {
        if (next === "sign-in" || next === "sign-up") {
            setTabState(next);
            setAuthError(null);
        }
    }

    return (
        <SafeAreaView className="flex-1 bg-primary">
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
            {authReady && isSignedIn && (
                <View
                    style={{
                        flex: 1,
                        justifyContent: "center",
                        alignItems: "center",
                        paddingHorizontal: 24,
                    }}
                >
                    <Text className="text-2xl font-[JosefinSans-Bold] mb-4">
                        Welcome back, {displayName}
                    </Text>

                    <Select
                        value={selectedTrip}
                        onValueChange={setSelectedTrip}
                        disabled={loadingTrips || tripsState.length === 0}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue
                                className="text-muted"
                                placeholder={
                                    loadingTrips
                                        ? "Loading trips…"
                                        : tripsState.length === 0
                                          ? "No trips yet"
                                          : "Select a trip"
                                }
                            />
                        </SelectTrigger>
                        <SelectContent>
                            {loadingTrips && (
                                <SelectItem
                                    disabled
                                    label="Loading"
                                    value="loading"
                                >
                                    Loading trips…
                                </SelectItem>
                            )}
                            {!loadingTrips &&
                                tripsState.map((trip) => (
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
                    {tripsError && (
                        <View className="mt-3 text-center items-center">
                            <Text className="text-muted text-sm">
                                {tripsError}
                            </Text>
                            <Button
                                variant="link"
                                className="mt-1"
                                onPress={loadTrips}
                            >
                                <Text>Try again</Text>
                            </Button>
                        </View>
                    )}

                    <View
                        style={{ flexDirection: "row", gap: 12, marginTop: 24 }}
                    >
                        <Button
                            className="font-bold flex flex-row items-center justify-center"
                            onPress={async () => {
                                if (!selectedTrip?.value) return;
                                try {
                                    setSettingTrip(true);
                                    await setCurrentTrip(
                                        String(selectedTrip.value)
                                    );
                                    router.push("/(tabs)/home");
                                } finally {
                                    setSettingTrip(false);
                                }
                            }}
                            disabled={disablePrimaryAction}
                        >
                            <PlaneLandingIcon color="white" className="mr-2" />
                            <Text>
                                {settingTrip
                                    ? "Loading…"
                                    : disablePrimaryAction
                                      ? "Select a trip"
                                      : "Let's Go!"}
                            </Text>
                        </Button>

                        <Button
                            variant="secondary"
                            className="ml-3"
                            onPress={() => setCreateVisible(true)}
                        >
                            <Text>Create Trip</Text>
                        </Button>
                    </View>
                </View>
            )}
            {showAuthOverlay && (
                <View className="absolute bg-black opacity-30 inset-0" />
            )}

            {showAuthForm && (
                <View className=" flex flex-col gap-y-2 p-5 z-10">
                    <Tabs value={tabState} onValueChange={handleTabChange}>
                        <TabsList>
                            <TabsTrigger value="sign-in">
                                <Text>Sign In</Text>
                            </TabsTrigger>
                            <TabsTrigger value="sign-up">
                                <Text>Sign Up</Text>
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                    {tabState === "sign-in" ? (
                        <SignInForm
                            onSubmit={handleSignIn}
                            onSwitch={() => handleTabChange("sign-up")}
                            loading={authBusy}
                            errorMessage={authError}
                        />
                    ) : (
                        <SignUpForm
                            onSubmit={handleSignUp}
                            onSwitch={() => handleTabChange("sign-in")}
                            loading={authBusy}
                            errorMessage={authError}
                        />
                    )}
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
            <Modal visible={createVisible} animationType="slide" transparent>
                <View className="flex-1 bg-black/50 justify-center items-center">
                    <View className="w-11/12 bg-slate-900 p-4 rounded-lg">
                        <Text className="text-lg font-[JosefinSans-Bold] mb-2 text-white">
                            Create Trip
                        </Text>
                        <TextInput
                            placeholder="Trip name"
                            placeholderTextColor="#94a3b8"
                            value={newTripName}
                            onChangeText={setNewTripName}
                            className="bg-white/10 text-white p-2 rounded-md mb-3"
                        />
                        <Text className="text-sm text-white mb-1">Destination</Text>
                        <Select
                            value={
                                newTripDestination
                                    ? { value: newTripDestination, label: locations.find((l: any) => l.value === newTripDestination)?.label || newTripDestination }
                                    : undefined
                            }
                            onValueChange={(val) => setNewTripDestination(typeof val === "string" ? val : (val as any)?.value || "")}
                        >
                            <SelectTrigger className="bg-white/10 text-white p-2 rounded-md mb-3">
                                <SelectValue placeholder="Select destination" />
                            </SelectTrigger>
                            <SelectContent className="max-h-64">
                                <View className="p-2 border-b border-border">
                                    <TextInput
                                        value={destinationSearch}
                                        onChangeText={setDestinationSearch}
                                        placeholder="Search countries..."
                                        className="bg-white px-3 py-2 rounded border border-border"
                                        placeholderTextColor="#999"
                                    />
                                </View>
                                <RNScrollView style={{ maxHeight: 240 }}>
                                    {locations
                                        .filter((loc) => 
                                            loc.label.toLowerCase().includes(destinationSearch.toLowerCase())
                                        )
                                        .map((loc) => (
                                            <SelectItem key={loc.value} value={loc.value} label={loc.label}>
                                                {loc.label}
                                            </SelectItem>
                                        ))}
                                    {locations.filter((loc) => 
                                        loc.label.toLowerCase().includes(destinationSearch.toLowerCase())
                                    ).length === 0 && (
                                        <View className="p-4">
                                            <Text className="text-center text-gray-500">No countries found</Text>
                                        </View>
                                    )}
                                </RNScrollView>
                            </SelectContent>
                        </Select>
                        <View className="flex-row justify-end">
                            <Button
                                variant="ghost"
                                onPress={() => setCreateVisible(false)}
                            >
                                <Text>Cancel</Text>
                            </Button>
                            <Button
                                onPress={handleCreateTrip}
                                className="ml-2"
                                disabled={creatingTrip}
                            >
                                <Text>
                                    {creatingTrip ? "Creating…" : "Create"}
                                </Text>
                            </Button>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

function authErrorMessage(error: unknown) {
    if (error instanceof FirebaseError) {
        switch (error.code) {
            case "auth/invalid-credential":
            case "auth/wrong-password":
                return "That email and password combo didn't work. Double-check and try again.";
            case "auth/user-not-found":
                return "We couldn't find an account with that email.";
            case "auth/email-already-in-use":
                return "An account with that email already exists. Try signing in instead.";
            case "auth/weak-password":
                return "Choose a stronger password (at least 6 characters).";
            default:
                return "Something went wrong. Please try again.";
        }
    }
    if (typeof error === "object" && error && "message" in error) {
        return String((error as { message?: string }).message);
    }
    return "Something went wrong. Please try again.";
}
