import * as React from "react";
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
    Map,
    DollarSign,
    DollarSignIcon,
    LogOut,
    List,
    ShoppingBagIcon,
    StarIcon,
    WrenchIcon,
    Search,
    Plus,
    Wallet,
    ChevronRight
} from "lucide-react-native";
import {
    SafeAreaView,
    View,
    TouchableOpacity,
    Image,
    ImageBackground,
    TextInput,
    ScrollView,
    Linking,
    RefreshControl,
    Dimensions,
    Modal,
    ActivityIndicator,
} from "react-native";
import countryList from "country-list-js";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useFocusEffect } from "expo-router";
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
import {
    signOutCurrentUser,
    getTripItems,
    getTrips,
    createTrip,
    updateUserProfile,
    setCurrentTrip as remoteSetCurrentTrip,
    getFinance,
} from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/useToast";
import { BudgetDialog } from "@/components/budget-dialog";
import { useUser } from "@/hooks/useUser";
import type { Trip, TripItem } from "@/types/user";
import { getCurrencySymbol } from "@/lib/utils";
// Modal is provided by react-native in the main import block
import { Input } from "@/components/ui/input";
import { useCart } from "@/context/cart-context";
import { useCurrency } from "@/context/currency-context";

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
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

function TripItemCarousel({
    items,
    onItemPress,
    onProductPagePress,
    onAddToCart,
    currencySymbol,
    convertAmount,
}: {
    items: TripItem[];
    onItemPress: (item: TripItem) => void;
    onProductPagePress: (item: TripItem) => void;
    onAddToCart: (item: TripItem) => void;
    currencySymbol: string;
    convertAmount: (amount: number) => number;
}) {
    return (
        <View className="mb-4">
            <Text className="text-2xl font-[JosefinSans-Bold]">
                Recent Trip Items
            </Text>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: 200 }}
            >
                {items.map((item) => (
                    <Card key={item.id} className="mr-4 min-w-60 w-40">
                        <TouchableOpacity onPress={() => onItemPress(item)}>
                            <Image
                                source={{ uri: item.thumbnail }}
                                className="w-full h-40 p-2 rounded-t-lg"
                            />
                        </TouchableOpacity>
                        <CardContent className="p-2">
                            <Text className="text-foreground font-[JosefinSans-Light] text-start p-2">
                                {item.name}
                            </Text>
                            <View className="flex flex-row flex-shrink items-center">
                                <Image
                                    source={{ uri: item.source_icon }}
                                    className="w-4 h-4"
                                />
                                <Text className="text-foreground font-[JosefinSans-Regular] text-start p-2">
                                    {item.source}
                                </Text>
                            </View>
                            <Text className="text-foreground font-[JosefinSans-Regular] text-start p-2">
                                Available For: {currencySymbol}
                                {convertAmount(item.price || 0).toFixed(2)}
                            </Text>

                            <View className="flex flex-row gap-x-2 justify-end items-end mx-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onPress={() => onProductPagePress(item)}
                                    className="mt-2"
                                >
                                    <DollarSignIcon
                                        color="black"
                                        className="mr-2 h-2 w-2"
                                    />
                                </Button>
                                <Button
                                    variant="default"
                                    size="sm"
                                    onPress={() => onAddToCart(item)}
                                    className="mt-2 shadow-xl border-border"
                                >
                                    <ShoppingBagIcon
                                        color="black"
                                        className="mr-2 h-2 w-2"
                                        strokeWidth={0.9}
                                    />
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onPress={() => onItemPress(item)}
                                    className="mt-2"
                                >
                                    <WrenchIcon
                                        color="black"
                                        className="mr-2 h-2 w-2"
                                        strokeWidth={0.8}
                                    />
                                </Button>
                            </View>
                        </CardContent>
                    </Card>
                ))}
            </ScrollView>
        </View>
    );
}

export default function Home() {
    const { toast } = useToast();
    const { addToCart } = useCart();
    const router = useRouter();
    const { user, userProfile } = useUser();
    const [trips, setTrips] = useState<Trip[]>([]);
    const [currentTrip, setCurrentTrip] = useState<Trip | null>(null);
    const [tripItems, setTripItems] = useState<TripItem[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_itemsLoading, setItemsLoading] = useState(false);
    const [showNameDialog, setShowNameDialog] = useState(false);
    const [nameValue, setNameValue] = useState("");
    const [homeCountryValue, setHomeCountryValue] = useState("");
    const [promptedForName, setPromptedForName] = useState(false);
    const [savingName, setSavingName] = useState(false);
    const [savingTrip, setSavingTrip] = useState(false);

    // Create trip modal state
    const [showCreateTripDialog, setShowCreateTripDialog] = useState(false);
    const [newTripName, setNewTripName] = useState("");
    const [newTripDestination, setNewTripDestination] = useState("");
    const [destinationSearch, setDestinationSearch] = useState("");
    const [creatingTrip, setCreatingTrip] = useState(false);

    // Finance data from backend
    const [financeData, setFinanceData] = useState<any>(null);

    const { convertAmount, displayCurrency, setBaseCurrency, setDisplayCurrency } = useCurrency();

    // Get home currency from user's home country
    const homeCurrency = React.useMemo(() => {
        if (!userProfile?.homeCountry) return "USD";
        const homeCountryData = locations.find(l => l.value === userProfile.homeCountry);
        return homeCountryData?.currency.currencyCode || "USD";
    }, [userProfile?.homeCountry]);

    useEffect(() => {
        if (userProfile) {
            // Normalize trip data to handle both old and new formats
            const normalizedTrips = (userProfile.trips ?? []).map((trip: any) => {
                const tripLocation = trip.location || trip.destination || "";
                // Look up currency from location if not set
                let tripCurrency = trip.currency;
                if (!tripCurrency && tripLocation) {
                    const locationData = locations.find(l => l.value === tripLocation);
                    tripCurrency = locationData?.currency.currencyCode || "USD";
                }
                return {
                    ...trip,
                    location: tripLocation,
                    budget: trip.budget ?? trip.totalBudget ?? 0,
                    currency: tripCurrency || "USD",
                };
            });
            setTrips(normalizedTrips);
        } else {
            setTrips([]);
        }
    }, [userProfile]);

    // If the user's profile is missing a displayName or homeCountry, prompt once to collect it
    useEffect(() => {
        if (!promptedForName && userProfile) {
            if (
                !userProfile.displayName ||
                userProfile.displayName.trim() === "" ||
                !userProfile.homeCountry ||
                userProfile.homeCountry.trim() === ""
            ) {
                setShowNameDialog(true);
            }
            setPromptedForName(true);
        }
    }, [userProfile, promptedForName]);

    useEffect(() => {
        if (!trips.length) {
            setCurrentTrip(null);
            return;
        }

        if (userProfile?.currentTripId) {
            const match =
                trips.find((t) => t.id === userProfile.currentTripId) ?? null;
            if (match) {
                setCurrentTrip(match);
                return;
            }
        }

        setCurrentTrip(trips[0] ?? null);
    }, [trips, userProfile?.currentTripId]);

    // Set base currency to USD (items are stored in USD), display home currency initially
    // Only run when trip changes, not when currency functions change
    useEffect(() => {
        if (currentTrip && homeCurrency) {
            setBaseCurrency("USD"); // Base is always USD since items are stored in USD
            setDisplayCurrency(homeCurrency); // Display starts with home currency
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentTrip?.id, homeCurrency]);

    useFocusEffect(
        useCallback(() => {
            let isActive = true;

            async function refreshTrips() {
                if (!user) {
                    if (isActive) {
                        setTrips([]);
                    }
                    return;
                }

                try {
                    const latest = await getTrips();
                    if (!isActive) return;

                    const normalized = Array.isArray(latest)
                        ? (latest as any[]).map((trip: any) => {
                            const tripLocation = trip.location || trip.destination || "";
                            // Look up currency from location if not set
                            let tripCurrency = trip.currency;
                            if (!tripCurrency && tripLocation) {
                                const locationData = locations.find(l => l.value === tripLocation);
                                tripCurrency = locationData?.currency.currencyCode || "USD";
                            }
                            return {
                                ...trip,
                                location: tripLocation,
                                budget: trip.budget ?? trip.totalBudget ?? 0,
                                currency: tripCurrency || "USD",
                            };
                        })
                        : [];
                    setTrips(normalized);
                } catch (error) {
                    console.error("Failed to refresh trips", error);
                    if (isActive) {
                        toast({
                            title: "Error",
                            description: "Failed to refresh trips.",
                            variant: "error",
                        });
                    }
                }
            }

            refreshTrips();

            return () => {
                isActive = false;
            };
        }, [user, toast])
    );

    // Pull-to-refresh state + handler
    const [refreshing, setRefreshing] = useState(false);
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            if (!user) {
                setTrips([]);
                setTripItems([]);
                setRefreshing(false);
                return;
            }

            const latest = await getTrips();
            const normalized = Array.isArray(latest)
                ? (latest as any[]).map((trip: any) => {
                    const tripLocation = trip.location || trip.destination || "";
                    // Look up currency from location if not set
                    let tripCurrency = trip.currency;
                    if (!tripCurrency && tripLocation) {
                        const locationData = locations.find(l => l.value === tripLocation);
                        tripCurrency = locationData?.currency.currencyCode || "USD";
                    }
                    return {
                        ...trip,
                        location: tripLocation,
                        budget: trip.budget ?? trip.totalBudget ?? 0,
                        currency: tripCurrency || "USD",
                    };
                })
                : [];
            setTrips(normalized);

            const newCurrent =
                (userProfile?.currentTripId &&
                    normalized.find(
                        (t) => t.id === userProfile.currentTripId
                    )) ||
                normalized[0] ||
                null;
            setCurrentTrip(newCurrent);

            if (newCurrent) {
                const items = await getTripItems(newCurrent.id);
                setTripItems(items as TripItem[]);

                // Fetch finance data
                try {
                    const finance = await getFinance(newCurrent.id);
                    setFinanceData(finance);
                } catch (err) {
                    console.error("Failed to fetch finance data", err);
                }
            } else {
                setTripItems([]);
                setFinanceData(null);
            }
        } catch (error) {
            console.error("Pull-to-refresh failed", error);
            toast({
                title: "Error",
                description: "Failed to refresh data.",
                variant: "error",
            });
        } finally {
            setRefreshing(false);
        }
    }, [user, userProfile?.currentTripId, toast]);

    useEffect(() => {
        let mounted = true;
        async function loadItems() {
            if (!currentTrip) {
                setTripItems([]);
                return;
            }
            setItemsLoading(true);
            try {
                const items = await getTripItems(currentTrip.id);
                console.log("Loaded trip items:", items);
                if (mounted) setTripItems(items as TripItem[]);
            } catch (err) {
                console.error("Failed to load trip items", err);
                toast({
                    title: "Error",
                    description: "Failed to load trip items.",
                    variant: "error",
                });
                if (mounted) setTripItems([]);
            } finally {
                if (mounted) setItemsLoading(false);
            }
        }
        loadItems();
        return () => {
            mounted = false;
        };
    }, [currentTrip, toast]);

    // Fetch finance data from backend when trip changes
    useEffect(() => {
        let mounted = true;
        async function loadFinanceData() {
            if (!currentTrip) {
                setFinanceData(null);
                return;
            }
            try {
                const finance = await getFinance(currentTrip.id);
                if (mounted) setFinanceData(finance);
            } catch (err) {
                console.error("Failed to load finance data", err);
                if (mounted) setFinanceData(null);
            }
        }
        loadFinanceData();
        return () => {
            mounted = false;
        };
    }, [currentTrip]);

    const handleUpdateBudget = async (newBudget: number) => {
        // TODO: Implement budget update for the trip
        toast({
            title: "Info",
            description: "Budget update for trips is not yet implemented.",
            variant: "info",
        });
    };

    const handleSignOut = async () => {
        try {
            await signOutCurrentUser();
            toast({
                title: "Signed Out",
                description: "You have been signed out.",
                variant: "info",
            });
            router.replace("/trip-selection");
        } catch (err) {
            console.error(err);
            toast({
                title: "Error",
                description: "Failed to sign out.",
                variant: "error",
            });
        }
    };

    // Use backend finance data if available, otherwise calculate locally
    // Calculate totalSpent the same way as finance.tsx - from categories
    const totalSpent = financeData?.categories
        ? financeData.categories.reduce((sum, c) =>
            sum + (c.items || []).reduce((s, it) => s + Number(it.amount || 0), 0), 0
        )
        : tripItems.reduce((acc, item) => acc + (item.price || 0), 0);
    const totalSpentDisplay = convertAmount(totalSpent);

    const budget = financeData?.budget ?? currentTrip?.budget ?? 0;
    const remainingBudget = financeData?.remainingBudget ?? Math.max(budget - totalSpent, 0);
    const remainingBudgetDisplay = convertAmount(remainingBudget);

    // Get the current currency symbol
    const currencySymbol = getCurrencySymbol(displayCurrency);

    const locationRef = useRef(null);
    const insets = useSafeAreaInsets();
    const contentInsets = {
        top: insets.top,
        bottom: insets.bottom,
        left: 12,
        right: 12,
    };

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
        const { width, height } = Dimensions.get("window");
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
        }, [star.opacity, opacity]);

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
            <AnimatedStarIcon
                color="black"
                fill="white"
                style={animatedStyle}
            />
        );
    }



    return (
        <SafeAreaView className="flex-1 bg-background">

            {/* Prompt modal for missing display name and home country */}
            <Modal visible={showNameDialog} transparent animationType="fade">
                <View className="flex-1 justify-center items-center bg-black/50">
                    <View className="bg-background p-6 rounded-lg w-11/12 max-w-md">
                        <Text className="text-xl font-[JosefinSans-Bold] mb-2">
                            Hey — what&apos;s your name?
                        </Text>
                        <Text className="text-sm text-muted-foreground mb-4">
                            We use your name and home country to personalize your trips.
                        </Text>
                        <Input
                            value={nameValue}
                            onChangeText={setNameValue}
                            placeholder="Full name"
                            autoCapitalize="words"
                        />
                        <View className="mt-4">
                            <Text className="text-sm text-muted-foreground mb-2">
                                Home Country
                            </Text>
                            <Select
                                value={{ value: homeCountryValue, label: homeCountryValue ? locations.find(l => l.value === homeCountryValue)?.label || homeCountryValue : "Select your country" }}
                                onValueChange={(val) => setHomeCountryValue(val?.value || "")}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select your country" />
                                </SelectTrigger>
                                <SelectContent>
                                    <NativeSelectScrollView>
                                        <SelectGroup>
                                            {locations.map((country) => (
                                                <SelectItem
                                                    key={country.value}
                                                    label={country.label}
                                                    value={country.value}
                                                >
                                                    {country.label}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </NativeSelectScrollView>
                                </SelectContent>
                            </Select>
                        </View>
                        <View className="flex-row justify-end gap-2 mt-4">
                            <Button
                                variant="outline"
                                onPress={() => setShowNameDialog(false)}
                                disabled={savingName}
                            >
                                <Text>Cancel</Text>
                            </Button>
                            <Button
                                onPress={async () => {
                                    if (!nameValue.trim() || !homeCountryValue) {
                                        toast({
                                            title: "Missing Information",
                                            description: "Please enter your name and select your home country.",
                                            variant: "error",
                                        });
                                        return;
                                    }
                                    setSavingName(true);
                                    try {
                                        await updateUserProfile({
                                            displayName: nameValue.trim(),
                                            homeCountry: homeCountryValue,
                                        });
                                        setShowNameDialog(false);
                                        setNameValue("");
                                        setHomeCountryValue("");
                                        toast({
                                            title: "Thanks!",
                                            description:
                                                "Your profile has been saved.",
                                            variant: "success",
                                        });
                                    } catch (err) {
                                        console.error(
                                            "Failed to save profile",
                                            err
                                        );
                                        toast({
                                            title: "Error",
                                            description:
                                                "Failed to save your profile.",
                                            variant: "error",
                                        });
                                    } finally {
                                        setSavingName(false);
                                    }
                                }}
                                disabled={savingName}
                            >
                                <Text>Save</Text>
                            </Button>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Create Trip Modal */}
            <Modal visible={showCreateTripDialog} transparent animationType="fade">
                <View className="flex-1 justify-center items-center bg-black/50">
                    <View className="bg-background p-6 rounded-lg w-11/12 max-w-md">
                        <Text className="text-xl font-[JosefinSans-Bold] mb-2">
                            Create New Trip
                        </Text>
                        <Text className="text-sm text-muted-foreground mb-4">
                            Enter the details for your new trip.
                        </Text>

                        <Text className="text-sm text-gray-700 mb-1">Trip Name</Text>
                        <Input
                            value={newTripName}
                            onChangeText={setNewTripName}
                            placeholder="e.g., Summer in Paris"
                            autoCapitalize="words"
                            className="mb-4"
                        />

                        <Text className="text-sm text-gray-700 mb-2">Destination</Text>
                        <Select
                            value={{
                                value: newTripDestination,
                                label: newTripDestination ? locations.find(l => l.value === newTripDestination)?.label || newTripDestination : "Select destination"
                            }}
                            onValueChange={(val) => setNewTripDestination(val?.value || "")}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select destination" />
                            </SelectTrigger>
                            <SelectContent>
                                <View className="p-2 border-b border-border">
                                    <TextInput
                                        value={destinationSearch}
                                        onChangeText={setDestinationSearch}
                                        placeholder="Search countries..."
                                        className="bg-white px-3 py-2 rounded border border-border"
                                        placeholderTextColor="#999"
                                    />
                                </View>
                                <NativeSelectScrollView>
                                    <SelectGroup>
                                        {locations
                                            .filter((country) =>
                                                country.label.toLowerCase().includes(destinationSearch.toLowerCase())
                                            )
                                            .map((country) => (
                                                <SelectItem
                                                    key={country.value}
                                                    label={country.label}
                                                    value={country.value}
                                                >
                                                    {country.label}
                                                </SelectItem>
                                            ))}
                                        {locations.filter((country) =>
                                            country.label.toLowerCase().includes(destinationSearch.toLowerCase())
                                        ).length === 0 && (
                                                <View className="p-4">
                                                    <Text className="text-center text-gray-500">No countries found</Text>
                                                </View>
                                            )}
                                    </SelectGroup>
                                </NativeSelectScrollView>
                            </SelectContent>
                        </Select>

                        <View className="flex-row justify-end gap-2 mt-6">
                            <Button
                                variant="outline"
                                onPress={() => {
                                    setShowCreateTripDialog(false);
                                    setNewTripName("");
                                    setNewTripDestination("");
                                }}
                                disabled={creatingTrip}
                            >
                                <Text>Cancel</Text>
                            </Button>
                            <Button
                                onPress={async () => {
                                    if (!newTripName.trim() || !newTripDestination) {
                                        toast({
                                            title: "Missing Information",
                                            description: "Please enter a trip name and select a destination.",
                                            variant: "error",
                                        });
                                        return;
                                    }

                                    setCreatingTrip(true);
                                    try {
                                        const selectedLocation = locations.find(l => l.value === newTripDestination);
                                        const newTrip = await createTrip({
                                            name: newTripName.trim(),
                                            location: newTripDestination,
                                            currency: selectedLocation?.currency.currencyCode || "USD",
                                        });

                                        // Refresh trips list
                                        const updatedTrips = await getTrips();
                                        const normalizedTrips = Array.isArray(updatedTrips)
                                            ? (updatedTrips as any[]).map((trip: any) => {
                                                const tripLocation = trip.location || trip.destination || "";
                                                // Look up currency from location if not set
                                                let tripCurrency = trip.currency;
                                                if (!tripCurrency && tripLocation) {
                                                    const locationData = locations.find(l => l.value === tripLocation);
                                                    tripCurrency = locationData?.currency.currencyCode || "USD";
                                                }
                                                return {
                                                    ...trip,
                                                    location: tripLocation,
                                                    budget: trip.budget ?? trip.totalBudget ?? 0,
                                                    currency: tripCurrency || "USD",
                                                };
                                            })
                                            : [];
                                        setTrips(normalizedTrips);

                                        setShowCreateTripDialog(false);
                                        setNewTripName("");
                                        setNewTripDestination("");

                                        toast({
                                            title: "Success!",
                                            description: "Your trip has been created.",
                                            variant: "success",
                                        });
                                    } catch (err) {
                                        console.error("Failed to create trip", err);
                                        toast({
                                            title: "Error",
                                            description: "Failed to create trip. Please try again.",
                                            variant: "error",
                                        });
                                    } finally {
                                        setCreatingTrip(false);
                                    }
                                }}
                                disabled={creatingTrip}
                            >
                                {creatingTrip ? <ActivityIndicator size="small" color="white" /> : <Text>Create Trip</Text>}
                            </Button>
                        </View>
                    </View>
                </View>
            </Modal>

            <ScrollView
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                    />
                }
            >

                {/* Full-width header band (edge-to-edge) as logo background */}
                <ImageBackground
                    source={require("../../assets/images/korea.png")}
                    className="w-full pt-20"

                >
                    {/* Dark overlay */}
                    <View
                        style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: "rgba(0, 0, 0, 0.1)",
                        }}
                    />

                    <View className="px-6 pb-4">
                        {/* top-right menu (three vertical dots) */}
                        <View
                            style={{
                                position: "absolute",
                                top: -45,
                                right: 5,
                                zIndex: 20,
                            }}
                        >
                            <Button
                                onPress={handleSignOut}
                                variant="ghost"
                                className="rounded-full bg-black/30 "
                            >
                                <LogOut color="white" size="16" />
                            </Button>
                        </View>

                        {/* <View className="mb-1">
                            <Image
                                source={require("../../components/logo/skypocketlogo.png")}
                                style={{
                                    width: 160,
                                    height: 100,
                                    resizeMode: "contain",
                                }}
                            />
                        </View> */}
                        <View className="flex-col justify-between items-start mb-2">
                            <Text className="text-4xl font-[JosefinSans-Bold] text-white">
                                안녕,
                            </Text>
                            <Text className="text-4xl font-[JosefinSans-Bold] text-white">
                                {user?.displayName || "traveler"}
                            </Text>

                        </View>



                    </View>
                </ImageBackground>

                <View className="m-6 flex-1">
                    <View className="flex-row items-center gap-3 mb-4">
                        <View className="flex-1">
                            <Select className="bg-white rounded-medium border-white border-5">
                                <SelectTrigger className="w-full bg-white p-2 rounded-medium border-border "
                                    style={{ backgroundColor: "white" }}
                                >
                                    <Search className="size-8"></Search>
                                    <SelectValue
                                        className="text-gray-500 font-[JosefinSans-Regular]"
                                        placeholder="Update your location"
                                    />
                                </SelectTrigger>
                                <SelectContent
                                    ref={locationRef}
                                    insets={contentInsets}
                                >
                                    <NativeSelectScrollView>
                                        <SelectGroup className="bg-white">
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

                        <Button
                            variant="secondary"
                            className=" rounded border border-gray-300"
                            onPress={async () => {
                                const target =
                                    displayCurrency === homeCurrency
                                        ? (currentTrip?.currency || "USD")
                                        : homeCurrency;
                                try {
                                    await setDisplayCurrency(target);
                                    toast({
                                        title: "Currency Changed",
                                        description: `Showing prices in ${target} ${displayCurrency === homeCurrency}`,
                                        variant: "success",
                                    });
                                } catch (err) {
                                    console.error("Failed to change currency", err);
                                    toast({
                                        title: "Error",
                                        description: "Unable to change currency.",
                                        variant: "error",
                                    });
                                }
                            }}
                        >
                            <View className="flex-row items-center">
                                <DollarSign size={16} color="white" />
                                <Text className="ml-2 text-white">
                                    {displayCurrency} {displayCurrency === homeCurrency}
                                </Text>
                            </View>
                        </Button>
                    </View>

                    <Text className="text-2xl font-[JosefinSans-Bold] mb-3">
                        My trips
                    </Text>

                    {/* Trip selector: choose which trip to view locally (dropdown) */}
                    <View className="mb-4  ">
                        <Select
                            value={
                                currentTrip
                                    ? {
                                        label: currentTrip.name,
                                        value: currentTrip.id,
                                    }
                                    : undefined
                            }
                            onValueChange={async (val) => {
                                // `val` may be a raw string (id) or an Option object
                                // (some Select usages provide the full option object).
                                // Normalize to a string tripId before calling backend.
                                const anyVal: any = val;
                                const tripId: string | undefined =
                                    typeof anyVal === "string"
                                        ? anyVal
                                        : (anyVal?.value ?? undefined);

                                const picked = tripId
                                    ? (trips.find((x) => x.id === tripId) ??
                                        null)
                                    : null;
                                const prev = currentTrip;
                                // optimistic local update
                                setCurrentTrip(picked);

                                if (!tripId) return;

                                try {
                                    setSavingTrip(true);
                                    await remoteSetCurrentTrip(tripId);
                                    toast({
                                        title: "Saved",
                                        description: "Active trip updated.",
                                        variant: "success",
                                    });
                                } catch (err) {
                                    console.error(
                                        "Failed to set current trip",
                                        err
                                    );
                                    toast({
                                        title: "Error",
                                        description:
                                            "Unable to save active trip. Reverting.",
                                        variant: "error",
                                    });
                                    // revert local state
                                    setCurrentTrip(prev);
                                } finally {
                                    setSavingTrip(false);
                                }
                            }}
                        >
                            <SelectTrigger className="w-full bg-white p-2 rounded-medium border-border mb-2"
                                style={{ backgroundColor: "white" }}>
                                <SelectValue
                                    className={
                                        currentTrip
                                            ? "text-gray-500 font-[JosefinSans-Regular]"
                                            : "text-muted-foreground"
                                    }
                                    placeholder="Choose a trip"
                                />
                            </SelectTrigger>
                            <SelectContent insets={contentInsets}>
                                <NativeSelectScrollView>
                                    <SelectGroup className="bg-white">
                                        {trips.map((t) => (
                                            <SelectItem
                                                key={t.id}
                                                value={t.id}
                                                label={t.name}
                                            />

                                        ))}
                                    </SelectGroup>
                                </NativeSelectScrollView>
                            </SelectContent>
                        </Select>

                        {savingTrip && (
                            <View className="mt-2">
                                <ActivityIndicator size="small" color="#000" />
                            </View>
                        )}

                        {/* Create New Trip Button */}
                        <Button
                            onPress={() => setShowCreateTripDialog(true)}
                            className="w-full mt-2"
                        >
                            <Plus size={16} color="white" />
                            <Text className="ml-2">Create New Trip</Text>
                        </Button>
                    </View>


                    {currentTrip && (
                        <TripItemCarousel
                            items={tripItems}
                            currencySymbol={currencySymbol}
                            convertAmount={convertAmount}
                            onItemPress={(item) =>
                                router.push({
                                    pathname: "/similar-products",
                                    params: {
                                        tripItemId: item.id,
                                        tripId: currentTrip.id,
                                    },
                                })
                            }
                            onProductPagePress={(item) => {
                                if (item.productPage) {
                                    Linking.openURL(item.productPage);
                                } else {
                                    toast({
                                        title: "Info",
                                        description: "No product page available.",
                                        variant: "info",
                                    });
                                }
                            }}
                            onAddToCart={(item) => {
                                if (!currentTrip) {
                                    toast({
                                        title: "Select a trip",
                                        description:
                                            "Please pick an active trip before adding items to the cart.",
                                        variant: "info",
                                    });
                                    return;
                                }
                                addToCart(item, 1, currentTrip.id)
                                    .then(() =>
                                        toast({
                                            title: "Added to cart",
                                            description: `${item.name} is in your cart.`,
                                            variant: "success",
                                        })
                                    )
                                    .catch((error) =>
                                        toast({
                                            title: "Unable to add item",
                                            description:
                                                error instanceof Error
                                                    ? error.message
                                                    : "Please try again.",
                                            variant: "error",
                                        })
                                    );
                            }}
                        />
                    )}

                    <Card className="mb-4 bg-primary border border-border text-white">
                        <CardHeader>
                            <View className="flex-row items-center">
                                <Wallet size={20} color="white" className="mr-5" />
                                <CardTitle className="text-white ml-3">Current Budget Left</CardTitle>
                            </View>
                        </CardHeader>
                        <CardContent>
                            <View className="flex-row justify-between items-center mb-4">
                                <View className="flex-row items-center text-white">
                                    <Text className="text-3xl  text-white font-bold">
                                        {currencySymbol}{Number(convertAmount(financeData?.budget ?? currentTrip?.budget ?? 0)).toFixed(2)}
                                    </Text>
                                </View>
                                <Button
                                    variant="ghost"
                                    onPress={() => {
                                        router.push({
                                            pathname: "/finance",
                                            params: { budget: currentTrip?.budget ?? 0 }
                                        });
                                    }}
                                >
                                    <Text className="text-white bg-white/20 p-2 rounded-full">Edit</Text>
                                </Button>
                            </View>

                            {/* Progress bar */}
                            <View className="w-full">
                                <View className="h-3 bg-white/20 rounded-full overflow-hidden">
                                    <View
                                        className="h-full bg-secondary rounded-full"
                                        style={{
                                            width: `${Math.min(((financeData?.budget ?? currentTrip?.budget ?? 0) - totalSpent) / (financeData?.budget ?? currentTrip?.budget ?? 1) * 100, 100)}%`
                                        }}
                                    />
                                </View>
                                <View className="flex-row justify-between mt-2">
                                    <Text className="text-white/80 text-sm">
                                        Spent: {currencySymbol}{totalSpentDisplay.toFixed(2)}
                                    </Text>
                                    <Text className="text-white/80 text-sm">
                                        Remaining: {currencySymbol}{remainingBudgetDisplay.toFixed(2)}
                                    </Text>
                                </View>
                            </View>
                        </CardContent>
                    </Card>
                    <View className="flex-row justify-between items-center mb-1">
                        <Text className="text-2xl font-[JosefinSans-Bold] mb-3">
                            Recent Activity
                        </Text>
                        <TouchableOpacity
                            onPress={() => router.push("/finance")}
                            className="flex-row items-center mb-3"
                        >
                            <Text className="text-sm text-primary font-[JosefinSans-Bold]">
                                See all
                            </Text>
                            <ChevronRight size={16} color="#06ADD8" />
                        </TouchableOpacity>
                    </View>

                    <Card className="mb-4 bg-white border border-border">
                        <CardHeader>
                            <CardTitle>Transactions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {tripItems && tripItems.length > 0 ? (
                                <ScrollView style={{ maxHeight: 150 }}>
                                    {tripItems.map((item, index) => (
                                        <View key={item.id}>
                                            <View className="flex-row justify-between items-center py-2">
                                                <View className="flex-row items-center ">
                                                    <List
                                                        size={24}
                                                        color="black"
                                                    />
                                                    <Text className="ml-4">
                                                        {item.name}
                                                    </Text>
                                                </View>
                                                <Text>
                                                    -{currencySymbol}
                                                    {convertAmount(item.price || 0).toFixed(
                                                        2
                                                    )}
                                                </Text>
                                            </View>
                                            {index < tripItems.length - 1 && (
                                                <Separator />
                                            )}
                                        </View>
                                    ))}
                                </ScrollView>
                            ) : (
                                <Text className="text-gray-500 font-[JosefinSans-Regular]">No transactions yet.</Text>
                            )}
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
                            color="black"
                            fill="gray"
                        />
                    </View>
                )}
            </ScrollView>
            <View
                style={{
                    position: "absolute",
                    bottom: 50,
                    left: 50,
                    opacity: 1,
                    zIndex: -1,
                }}
            ></View>
            <View
                style={{
                    position: "absolute",
                    bottom: 80,
                    right: 50,
                    opacity: 0.5,
                    zIndex: -1,
                }}
            ></View>
        </SafeAreaView>
    );
}
