import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Progress } from "@/components/ui/progress";
import {
    ArrowBigDownDashIcon,
    ArrowLeft,
    ArrowUpRightFromCircleIcon,
    DollarSignIcon,
    InfoIcon,
    LockIcon,
    SaveIcon,
    ShoppingBagIcon,
} from "lucide-react-native";
import {
    View,
    Image,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { getTripItem, updateTripItem, getTrips } from "@/lib/firebase";
import { TripItem, ShoppingPage, Trip } from "@/types/user";
import { useUser } from "@/hooks/useUser";
import { useToast } from "@/hooks/useToast";
import { useCurrency } from "@/context/currency-context";
import { getCurrencySymbol } from "@/lib/utils";
import countryList from "country-list-js";

interface Country {
    name: string;
    iso2: string;
    continent?: string;
    currency: string;
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

export default function SimilarProductsScreen() {
    const { user, userProfile } = useUser();
    const { tripId, tripItemId } = useLocalSearchParams<{
        tripId: string;
        tripItemId: string;
    }>();
    const [tripItem, setTripItem] = useState<TripItem | null>(null);
    const [selectedPage, setSelectedPage] = useState<ShoppingPage | null>(null);
    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState(0);
    const [currentTrip, setCurrentTrip] = useState<Trip | null>(null);

    const {
        convertAmount,
        displayCurrency,
        setBaseCurrency,
        setDisplayCurrency,
    } = useCurrency();
    const currencySymbol = getCurrencySymbol(displayCurrency);

    // Get home currency from user's home country
    const homeCurrency = userProfile?.homeCountry
        ? locations.find((l) => l.value === userProfile.homeCountry)
              ?.currency || "USD"
        : "USD";

    // Fetch current trip and set up currency
    useEffect(() => {
        async function fetchTrip() {
            if (!tripId) return;
            try {
                const trips = await getTrips();
                console.log("Fetched trips:", trips);
                const trip = trips?.find((t: Trip) => t.id === tripId) || null;
                setCurrentTrip(trip);

                if (trip) {
                    setBaseCurrency("USD"); // Base is always USD
                    setDisplayCurrency(homeCurrency); // Display starts with home currency
                }
            } catch (err) {
                console.error("Failed to fetch trip", err);
            }
        }
        fetchTrip();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tripId, homeCurrency]);

    useEffect(() => {
        if (!user || !tripId || !tripItemId) return;

        // Slow progress animation to 85% over ~8 seconds
        let progressInterval: NodeJS.Timeout;
        let progressValue = 0;
        let pollInterval: NodeJS.Timeout;

        if (loading) {
            progressInterval = setInterval(() => {
                progressValue += 0.5; // Increment by 0.5% every 50ms
                if (progressValue <= 85) {
                    setProgress(progressValue);
                } else {
                    clearInterval(progressInterval);
                }
            }, 50); // Update every 50ms for smooth animation
        }

        async function fetchTripItem() {
            try {
                const data = await getTripItem(tripId, tripItemId);
                setTripItem(data);
                console.log("Fetched trip item:", data);

                if (data.parsingStatus === "PARSED") {
                    // Quickly complete the progress bar
                    clearInterval(progressInterval);
                    clearInterval(pollInterval);
                    setProgress(100);

                    // Small delay to show completed progress
                    setTimeout(() => {
                        setLoading(false);
                    }, 300);

                    if (!selectedPage) {
                        const primaryPage =
                            data._items?.pages?.find(
                                (p: ShoppingPage) =>
                                    p.productPage === data.productPage
                            ) ||
                            data._items?.pages?.[0] ||
                            null;
                        setSelectedPage(primaryPage);
                    }
                } else {
                    // Item not fully parsed yet, continue polling
                    console.log(
                        "Item not parsed yet, status:",
                        data.parsingStatus
                    );
                }
            } catch (error) {
                console.error("Failed to fetch trip item", error);
                // Don't stop loading on error - keep polling until success
            }
        }

        // Initial fetch
        fetchTripItem();

        // Poll every 2 seconds until item is parsed
        pollInterval = setInterval(() => {
            fetchTripItem();
        }, 2000);

        return () => {
            clearInterval(progressInterval);
            clearInterval(pollInterval);
        };
    }, [user, tripId, tripItemId, selectedPage]);

    const handleSelectSimilar = async (page: ShoppingPage) => {
        setSelectedPage(page);
    };

    const toast = useToast();

    const onSaveSelected = async () => {
        if (user && tripId && tripItemId && selectedPage) {
            await updateTripItem(tripId, tripItemId, {
                name: selectedPage.name,
                price: selectedPage.extractedPrice,
                thumbnail: selectedPage.thumbnail,
                productPage: selectedPage.productPage,
                source: selectedPage.source,
            });
        }
        toast.toast({
            title: "Item Updated",
            description: "The trip item has been updated successfully.",
            variant: "success",
        });
        router.back();
    };

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-background justify-center items-center px-8">
                <ActivityIndicator size="large" color="white" />
                <Text className="mt-4 text-lg font-[JosefinSans-Bold] text-center">
                    Analyzing your image...
                </Text>
                <View className="w-full mt-6 flex-col items-center">
                    <Progress
                        value={progress}
                        className="h-3 mx-5"
                        indicatorClassName="bg-primary"
                    />
                    <Text className="mt-2 text-sm text-muted-foreground font-[JosefinSans-Bold] text-center">
                        {progress < 85
                            ? "Processing image..."
                            : "Almost there!"}
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!tripItem) {
        return (
            <SafeAreaView className="flex-1 bg-background justify-center items-center">
                <Text className="text-lg text-destructive">
                    Could not load item.
                </Text>
                <Button onPress={() => router.back()} className="mt-4">
                    <Text>Go Back</Text>
                </Button>
            </SafeAreaView>
        );
    }

    const displayItem = selectedPage || tripItem;
    const similarItems = tripItem._items?.pages || [];

    const rawPrice =
        "price" in displayItem
            ? displayItem.price
            : (displayItem.extractedPrice ?? 0);
    const displayItemPrice = convertAmount(rawPrice).toFixed(2);

    // Toggle currency between home and trip currency
    const toggleCurrency = async () => {
        const tripCurrency = currentTrip?.currency || "USD";
        console.log(currentTrip);
        console.log("Trip currency:", tripCurrency);
        const target =
            displayCurrency === homeCurrency ? tripCurrency : homeCurrency;
        try {
            await setDisplayCurrency(target);
        } catch (err) {
            console.error("Failed to change currency", err);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-background">
            <ScrollView>
                <View className="p-4">
                    <View className="flex-row justify-between items-center mb-4">
                        <TouchableOpacity onPress={() => router.back()}>
                            <ArrowLeft size={24} color="black" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={toggleCurrency}
                            className="bg-primary px-4 py-2 rounded-full"
                        >
                            <Text className="text-white font-[JosefinSans-Bold]">
                                {displayCurrency}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View className="p-5 text-center flex justify-center items-center">
                        <Text className="text-3xl  flex font-bold">
                            You're getting a{" "}
                        </Text>
                        <Text className="text-3xl text-primary font-[JosefinSans-Bold] italic">
                            STEAL!
                        </Text>
                    </View>

                    <Card className="w-full">
                        <CardHeader>
                            <View className="flex-row justify-start items-center mt-2">
                                <CardTitle className="flex flex-col">
                                    <View className="w-full flex flex-row justify-start items-center gap-x-4 px-2 pb-2">
                                        <Text className="mt-2 text-lg font-[JosefinSans-Bold]">
                                            "{displayItem.name}""
                                        </Text>
                                    </View>
                                    <View className="flex flex-col gap-y-2 ">
                                        <View className="flex flex-row gap-x-2 ">
                                            <InfoIcon
                                                className="mr-2"
                                                size={20}
                                                color="black"
                                            />
                                            <View className="flex flex-row items-center">
                                                {displayItem.source_icon ? (
                                                    <Image
                                                        source={{
                                                            uri: displayItem.source_icon,
                                                        }}
                                                        className="w-4 h-4 mr-1"
                                                    />
                                                ) : null}
                                                <Text className="text-sm font-[JosefinSans-Bold] pt-2">
                                                    {displayItem.source}
                                                </Text>
                                            </View>
                                        </View>
                                        <View className="flex flex-row items-center gap-x-2">
                                            <DollarSignIcon
                                                className="mr-2"
                                                size={20}
                                                color="black"
                                            />
                                            <Text className="bg-primary/40 p-2 rounded-full font-[JosefinSans-Bold]">
                                                Pricing: {currencySymbol}
                                                {displayItemPrice}
                                            </Text>
                                        </View>
                                        <View className="flex flex-row flex-wrap rounded-xl px-2 py-1 mt-2">
                                            {selectedPage?.extensions?.map(
                                                (ext, index) => (
                                                    <Badge
                                                        key={index}
                                                        className="text-sm mr-2 mb-2"
                                                        variant="secondary"
                                                    >
                                                        <Text>{ext}</Text>
                                                    </Badge>
                                                )
                                            )}
                                        </View>
                                    </View>
                                </CardTitle>
                            </View>
                        </CardHeader>
                        <CardContent>
                            <Image
                                source={{
                                    uri:
                                        displayItem.thumbnail ||
                                        "https://via.placeholder.com/300",
                                }}
                                className="w-full h-48 rounded-lg"
                            />
                        </CardContent>
                        <CardFooter className="flex flex-row gap-x-2 justify-end">
                            <Button onPress={onSaveSelected}>
                                <SaveIcon
                                    size={20}
                                    className="mr-2"
                                    color="white"
                                />
                            </Button>
                            <Button
                                variant={"secondary"}
                                onPress={() => {
                                    router.navigate({
                                        pathname:
                                            (displayItem.productPage as any) ||
                                            "/",
                                    });
                                }}
                            >
                                <ArrowUpRightFromCircleIcon
                                    size={20}
                                    className="mr-2"
                                    color="white"
                                />
                            </Button>
                        </CardFooter>
                    </Card>

                    {similarItems.length > 0 &&
                        (() => {
                            const prices = similarItems
                                .map((item) => item.extractedPrice)
                                .filter(
                                    (price): price is number =>
                                        typeof price === "number" && price > 0
                                );

                            if (prices.length === 0) return null;

                            const minPrice = Math.min(...prices);
                            const maxPrice = Math.max(...prices);

                            // Calculate current item price position
                            const currentPrice =
                                "price" in displayItem
                                    ? displayItem.price
                                    : displayItem.extractedPrice || 0;

                            const priceRange = maxPrice - minPrice;
                            const pricePosition =
                                priceRange > 0
                                    ? ((currentPrice - minPrice) / priceRange) *
                                      100
                                    : 50;

                            return (
                                <Card className="w-full mt-6 mb-6">
                                    <CardHeader>
                                        <CardTitle>
                                            <Text className="text-lg font-semibold">
                                                Price Range
                                            </Text>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <View className="flex-row justify-between mb-2">
                                            <Text className="text-sm font-[JosefinSans-Bold] text-green-600">
                                                {currencySymbol}
                                                {convertAmount(
                                                    minPrice
                                                ).toFixed(2)}
                                            </Text>
                                            <Text className="text-sm font-[JosefinSans-Bold] text-red-600">
                                                {currencySymbol}
                                                {convertAmount(
                                                    maxPrice
                                                ).toFixed(2)}
                                            </Text>
                                        </View>
                                        <View className="relative">
                                            <View className="h-4 rounded-full overflow-hidden flex-row">
                                                <View
                                                    style={{
                                                        flex: 1,
                                                        backgroundColor:
                                                            "#22c55e",
                                                    }}
                                                />
                                                <View
                                                    style={{
                                                        flex: 1,
                                                        backgroundColor:
                                                            "#34d058",
                                                    }}
                                                />
                                                <View
                                                    style={{
                                                        flex: 1,
                                                        backgroundColor:
                                                            "#65d46e",
                                                    }}
                                                />
                                                <View
                                                    style={{
                                                        flex: 1,
                                                        backgroundColor:
                                                            "#84cc16",
                                                    }}
                                                />
                                                <View
                                                    style={{
                                                        flex: 1,
                                                        backgroundColor:
                                                            "#a3e635",
                                                    }}
                                                />
                                                <View
                                                    style={{
                                                        flex: 1,
                                                        backgroundColor:
                                                            "#fbbf24",
                                                    }}
                                                />
                                                <View
                                                    style={{
                                                        flex: 1,
                                                        backgroundColor:
                                                            "#fb923c",
                                                    }}
                                                />
                                                <View
                                                    style={{
                                                        flex: 1,
                                                        backgroundColor:
                                                            "#f97316",
                                                    }}
                                                />
                                                <View
                                                    style={{
                                                        flex: 1,
                                                        backgroundColor:
                                                            "#f87171",
                                                    }}
                                                />
                                                <View
                                                    style={{
                                                        flex: 1,
                                                        backgroundColor:
                                                            "#ef4444",
                                                    }}
                                                />
                                            </View>
                                            <View
                                                style={{
                                                    position: "absolute",
                                                    left: `${pricePosition}%`,
                                                    top: -4,
                                                    transform: [
                                                        { translateX: -8 },
                                                    ],
                                                }}
                                            >
                                                <View className="items-center">
                                                    <View className="w-6 h-6 rounded-full bg-white border-2 border-primary shadow-lg" />
                                                    <View className="mt-1 bg-primary px-2 py-1 rounded">
                                                        <Text className="text-xs font-[JosefinSans-Bold] text-white">
                                                            {currencySymbol}
                                                            {convertAmount(
                                                                currentPrice
                                                            ).toFixed(2)}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </View>
                                        </View>
                                        <View className="flex-row justify-center mt-10">
                                            <Text className="text-xs text-muted-foreground">
                                                Lowest to Highest Prices
                                            </Text>
                                        </View>
                                    </CardContent>
                                </Card>
                            );
                        })()}

                    <View className="mt-6">
                        <Text className="text-lg font-semibold mb-4">
                            Items Found For You
                        </Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                        >
                            {similarItems.map((item, index) => (
                                <TouchableOpacity
                                    key={index}
                                    onPress={() => handleSelectSimilar(item)}
                                >
                                    <Card
                                        className={`mr-4 w-40 ${
                                            selectedPage?.productPage ===
                                            item.productPage
                                                ? "border-primary"
                                                : "border-border"
                                        }`}
                                    >
                                        <CardContent className="p-2">
                                            <Image
                                                source={{
                                                    uri:
                                                        item.thumbnail ||
                                                        "https://via.placeholder.com/150",
                                                }}
                                                className="w-full h-24 rounded-md"
                                            />
                                            <View className="flex flex-row flex-wrap justify-between items-center mt-2">
                                                <Text className="text-sm font-[JosefinSans-Regular]">
                                                    {item.name}
                                                </Text>
                                                <View className="flex flex-row flex-shrink items-center">
                                                    {item.source_icon ? (
                                                        <Image
                                                            source={{
                                                                uri: item.source_icon,
                                                            }}
                                                            className="w-4 h-4 mr-1"
                                                        />
                                                    ) : null}
                                                    <Text
                                                        className="text-sm font-[JosefinSans-Bold] pt-2"
                                                        numberOfLines={1}
                                                        ellipsizeMode="tail"
                                                    >
                                                        {item.source}
                                                    </Text>
                                                </View>
                                                <Text className="text-md bg-primary/20 rounded-full p-1 font-[JosefinSans-Bold] pt-2">
                                                    {currencySymbol}
                                                    {convertAmount(
                                                        item.extractedPrice || 0
                                                    ).toFixed(2)}
                                                </Text>
                                            </View>
                                        </CardContent>
                                    </Card>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
