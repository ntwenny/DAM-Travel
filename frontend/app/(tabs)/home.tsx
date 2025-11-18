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
    Cloud,
    DollarSign,
    DollarSignIcon,
    KeyIcon,
    List,
    ShoppingBagIcon,
    StarIcon,
    WrenchIcon,
} from "lucide-react-native";
import {
    SafeAreaView,
    View,
    TouchableOpacity,
    Image,
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
    updateUserProfile,
    setCurrentTrip as remoteSetCurrentTrip,
} from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/useToast";
import { BudgetDialog } from "@/components/budget-dialog";
import { useUser } from "@/hooks/useUser";
import type { Trip, TripItem } from "@/types/user";
// Modal is provided by react-native in the main import block
import { Input } from "@/components/ui/input";
import { useCart } from "@/context/cart-context";

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

function TripItemCarousel({
    items,
    onItemPress,
    onProductPagePress,
    onAddToCart,
}: {
    items: TripItem[];
    onItemPress: (item: TripItem) => void;
    onProductPagePress: (item: TripItem) => void;
    onAddToCart: (item: TripItem) => void;
}) {
    return (
        <View className="mb-4">
            <Text className="text-2xl font-[JosefinSans-Bold] mb-2">
                Trip Items
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
                                Available For: $
                                {item.price?.toFixed(2) || "N/A"}
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
    const [promptedForName, setPromptedForName] = useState(false);
    const [savingName, setSavingName] = useState(false);
    const [savingTrip, setSavingTrip] = useState(false);

    useEffect(() => {
        if (userProfile) {
            setTrips(userProfile.trips ?? []);
        } else {
            setTrips([]);
        }
    }, [userProfile]);

    // If the user's profile is missing a displayName, prompt once to collect it
    useEffect(() => {
        if (!promptedForName && userProfile) {
            if (
                !userProfile.displayName ||
                userProfile.displayName.trim() === ""
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
                        ? (latest as Trip[])
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
            const normalized = Array.isArray(latest) ? (latest as Trip[]) : [];
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
            } else {
                setTripItems([]);
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

    const totalSpent = tripItems.reduce(
        (acc, item) => acc + (item.price || 0),
        0
    );

    const remainingBudget = (currentTrip?.budget ?? 0) - totalSpent;

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

    function Stars() {
        return (
            <>
                {starPositions.map((s, i) => (
                    <AnimatedStar key={`star-${i}`} star={s} />
                ))}
            </>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-background">
            <Stars />


            {/* Prompt modal for missing display name */}
            <Modal visible={showNameDialog} transparent animationType="fade">
                <View className="flex-1 justify-center items-center bg-black/50">
                    <View className="bg-background p-6 rounded-lg w-11/12 max-w-md">
                        <Text className="text-xl font-[JosefinSans-Bold] mb-2">
                            Hey — what&apos;s your name?
                        </Text>
                        <Text className="text-sm text-muted-foreground mb-4">
                            We use your name to personalize your trips.
                        </Text>
                        <Input
                            value={nameValue}
                            onChangeText={setNameValue}
                            placeholder="Full name"
                            autoCapitalize="words"
                        />
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
                                    if (!nameValue.trim()) return;
                                    setSavingName(true);
                                    try {
                                        await updateUserProfile({
                                            displayName: nameValue.trim(),
                                        });
                                        setShowNameDialog(false);
                                        setNameValue("");
                                        toast({
                                            title: "Thanks!",
                                            description:
                                                "Your name has been saved.",
                                            variant: "success",
                                        });
                                    } catch (err) {
                                        console.error(
                                            "Failed to save name",
                                            err
                                        );
                                        toast({
                                            title: "Error",
                                            description:
                                                "Failed to save your name.",
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

            <ScrollView
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                    />
                }
            >
                {/* Full-width header band (edge-to-edge) */}
                <View  className="w-full bg-primary pt-20">
                    <View className="px-6 pb-4">
                        <View className="flex-row justify-between items-start mb-2">
                            <Text className="text-4xl font-[JosefinSans-Bold] text-white">
                                Hi, {user?.displayName || "there"}
                            </Text>
                            <Button onPress={handleSignOut} variant="destructive" className="rounded-full bg-primary">
                                <KeyIcon className="mr-2 " color="white" />
                                <Text className=" text-sm font-[JosefinSans-Bold]">
                                    Sign Out
                                </Text>
                            </Button>
                        </View>

                        <View>
                            <Select>
                                <SelectTrigger className="w-full bg-white/10 border border-white/30">
                                    <SelectValue
                                        className="text-white"
                                        placeholder="Select a location"
                                    />
                                </SelectTrigger>
                                <SelectContent
                                    ref={locationRef}
                                    insets={contentInsets}
                                >
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
                    </View>
                </View>

                <View className="m-6 flex-1">

                    {currentTrip && (
                        <TripItemCarousel
                            items={tripItems}
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
                                        description:
                                            "No product page available.",
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

                    <Card className="mb-4 bg-primary/30 border border-border">
                        <CardHeader>
                            <CardTitle>Budget</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <View className="flex-row justify-between items-center">
                                <View className="flex-row items-center">
                                    <DollarSign size={24} color="black" />
                                    <Text className="text-xl ml-2">
                                        ${(currentTrip?.budget ?? 0).toFixed(2)}
                                    </Text>
                                </View>
                                <BudgetDialog
                                    initialValue={currentTrip?.budget ?? 0}
                                    onSave={handleUpdateBudget}
                                />
                            </View>
                            <Text className="text-sm text-muted-foreground mt-2">
                                Remaining: ${remainingBudget.toFixed(2)}
                            </Text>
                        </CardContent>
                    </Card>
                    {/* Trip selector: choose which trip to view locally (dropdown) */}
                    <View className="mt-4">
                        <Text className="text-sm text-muted-foreground mb-2">Select trip</Text>
                        <Select
                            value={currentTrip ? { label: currentTrip.name, value: currentTrip.id } : undefined}
                            onValueChange={async (val) => {
                                // `val` may be a raw string (id) or an Option object
                                // (some Select usages provide the full option object).
                                // Normalize to a string tripId before calling backend.
                                const anyVal: any = val;
                                const tripId: string | undefined =
                                    typeof anyVal === "string"
                                        ? anyVal
                                        : anyVal?.value ?? undefined;

                                const picked = tripId
                                    ? trips.find((x) => x.id === tripId) ?? null
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
                                    console.error("Failed to set current trip", err);
                                    toast({
                                        title: "Error",
                                        description: "Unable to save active trip. Reverting.",
                                        variant: "error",
                                    });
                                    // revert local state
                                    setCurrentTrip(prev);
                                } finally {
                                    setSavingTrip(false);
                                }
                            }}
                        >
                            <SelectTrigger className="w-full bg-white p-2 rounded border border-border mb-2">
                                <SelectValue className={currentTrip ? 'text-black' : 'text-muted-foreground'} placeholder="Choose a trip" />
                            </SelectTrigger>
                            <SelectContent insets={contentInsets}>
                                <NativeSelectScrollView>
                                    <SelectGroup>
                                        {trips.map((t) => (
                                            <SelectItem key={t.id} value={t.id} label={t.name} />
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
                    </View>

                    <Card className="mb-4 bg-primary/30 border border-border">
                        <CardHeader>
                            <CardTitle>Transactions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {tripItems && tripItems.length > 0 ? (
                                <ScrollView style={{ maxHeight: 150 }}>
                                    {tripItems.map((item, index) => (
                                        <View key={item.id}>
                                            <View className="flex-row justify-between items-center py-2">
                                                <View className="flex-row items-center">
                                                    <List
                                                        size={24}
                                                        color="black"
                                                    />
                                                    <Text className="ml-4">
                                                        {item.name}
                                                    </Text>
                                                </View>
                                                <Text>
                                                    -$
                                                    {(item.price || 0).toFixed(
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
                                <Text>No transactions yet.</Text>
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
            >
 
            </View>
            <View
                style={{
                    position: "absolute",
                    bottom: 80,
                    right: 50,
                    opacity: 0.5,
                    zIndex: -1,
                }}
            >
            </View>
        </SafeAreaView>
    );
}
