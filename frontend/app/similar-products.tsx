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
import { getTripItem, updateTripItem } from "@/lib/firebase";
import { TripItem, ShoppingPage } from "@/types/user";
import { useUser } from "@/hooks/useUser";
import { useToast } from "@/hooks/useToast";

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
                console.log("Fetched trip item:", data);

                if (data.parsingStatus === "PARSED") {
                    setLoading(false);
                    if (!selectedPage) {
                        console.log("Moo");
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
            ? (displayItem.price.toFixed(2) ?? 0)
            : (displayItem.extractedPrice?.toFixed(2) ?? 0);

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
                                        <View className="flex flex-row gap-x-2">
                                            <DollarSignIcon
                                                className="mr-2"
                                                size={20}
                                                color="black"
                                            />
                                            <Text className="font-[JosefinSans-Bold]">
                                                Pricing: {displayItemPrice}
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
                                                <Text className="text-md font-[JosefinSans-Bold] pt-2">
                                                    Pricing:{" "}
                                                    {item.extractedPrice}
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
