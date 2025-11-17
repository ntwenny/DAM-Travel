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
import {
    ArrowLeft,
    DollarSignIcon,
    InfoIcon,
    LockIcon,
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
import { getTripItem, updateTripItem } from "@/lib/firebase";
import { TripItem, ShoppingPage } from "@/types/user";
import { useUser } from "@/hooks/useUser";

export default function SimilarProductsScreen() {
    const { user } = useUser();
    const { tripId, tripItemId } = useLocalSearchParams<{
        tripId: string;
        tripItemId: string;
    }>();
    const [tripItem, setTripItem] = useState<TripItem | null>(null);
    const [selectedPage, setSelectedPage] = useState<ShoppingPage | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user || !tripId || !tripItemId) return;

        async function fetchTripItem() {
            try {
                const data = await getTripItem(tripId, tripItemId);
                setTripItem(data);

                if (data.parsingStatus === "PARSED") {
                    setLoading(false);
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
                }
            } catch (error) {
                console.error("Failed to fetch trip item", error);
                setLoading(false);
            }
        }

        fetchTripItem();
    }, [user, tripId, tripItemId, selectedPage]);

    const handleSelectSimilar = async (page: ShoppingPage) => {
        setSelectedPage(page);
        if (user && tripId && tripItemId) {
            await updateTripItem(tripId, tripItemId, {
                name: page.name,
                price: page.extractedPrice,
                thumbnail: page.thumbnail,
                productPage: page.productPage,
                source: page.source,
            });
        }
    };

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-background justify-center items-center">
                <ActivityIndicator size="large" color="white" />
                <Text className="mt-4 text-lg">Analyzing your image...</Text>
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

    const displayItemPrice =
        "price" in displayItem
            ? (displayItem.price ?? 0)
            : (displayItem.extractedPrice ?? 0);

    return (
        <SafeAreaView className="flex-1 bg-background">
            <ScrollView>
                <View className="p-4">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="mb-4"
                    >
                        <ArrowLeft size={24} color="white" />
                    </TouchableOpacity>

                    <View className="p-5 text-center flex justify-center items-center">
                        <Text className="text-3xl  flex font-bold">
                            You're getting a{" "}
                        </Text>
                        <Text className="text-3xl text-primary-foreground font-[JosefinSans-Bold] italic">
                            STEAL!
                        </Text>
                    </View>

                    <Card className="w-full">
                        <CardHeader>
                            <View className="flex-row justify-start items-center mt-2">
                                <CardTitle className="">
                                    <View className="w-full flex-row justify-start items-center pb-2">
                                        <InfoIcon size={20} color="white" />
                                        <Text className="mx-2 text-lg font-bold">
                                            {displayItem.name}
                                        </Text>
                                    </View>
                                    <View className="border-border border-2 flex flex-row flex-wrap rounded-xl px-2 py-1 mt-2">
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
                            <Text className="text-2xl font-bold text-center my-2">
                                ${displayItemPrice.toFixed(2)}
                            </Text>
                        </CardContent>
                    </Card>

                    <View className="mt-6">
                        <Text className="text-lg font-semibold mb-4">
                            Similar Items
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
                                            <View className="flex-row justify-between items-center mt-2">
                                                <Text className="text-sm font-bold">
                                                    {item.source}
                                                </Text>
                                            </View>
                                        </CardContent>
                                    </Card>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    <View className="mt-6">
                        <Button>
                            <ShoppingBagIcon
                                size={20}
                                className="text-primary-foreground mr-2"
                            />
                            <Text>Add to Bag</Text>
                        </Button>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
