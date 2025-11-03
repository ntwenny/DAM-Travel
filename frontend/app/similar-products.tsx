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
} from "react-native";
import { router } from "expo-router";

const similarItems = [
    {
        id: "1",
        source: "Store A",
        image: "https://via.placeholder.com/150",
        isLocked: true,
    },
    {
        id: "2",
        source: "Store B",
        image: "https://via.placeholder.com/150",
        isLocked: false,
    },
    {
        id: "3",
        source: "Store C",
        image: "https://via.placeholder.com/150",
        isLocked: true,
    },
];

export default function SimilarProductsScreen() {
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
                        <Text className="text-3xl text-primary-foreground font-bold italic">
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
                                            Hotdog Thermometer
                                        </Text>
                                    </View>
                                    <View className="border-border border-2 flex flex-row flex-wrap rounded-xl px-2 py-1 mt-2">
                                        <Badge className="text-sm">
                                            <DollarSignIcon
                                                size={16}
                                                className="mr-1"
                                            />
                                            <Text>On Sale</Text>
                                        </Badge>
                                        <Badge
                                            className="text-sm mr-2 mb-2"
                                            variant="secondary"
                                        >
                                            <Text>Free Shipping</Text>
                                        </Badge>
                                        <Badge
                                            className="text-sm mr-2 mb-2"
                                            variant="outline"
                                        >
                                            <Text>Internationally Shipped</Text>
                                        </Badge>
                                    </View>
                                </CardTitle>
                            </View>
                        </CardHeader>
                        <CardContent>
                            <Image
                                source={{
                                    uri: "https://via.placeholder.com/300",
                                }}
                                className="w-full h-48 rounded-lg"
                            />
                            <Text className="text-2xl font-bold text-center my-2">
                                $200
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
                            {similarItems.map((item) => (
                                <Card key={item.id} className="mr-4 w-40">
                                    <CardContent className="p-2">
                                        <Image
                                            source={{ uri: item.image }}
                                            className="w-full h-24 rounded-md"
                                        />
                                        {item.isLocked && (
                                            <View className="absolute top-3 right-3 bg-backdrop-blur p-1 rounded-full">
                                                <LockIcon
                                                    size={16}
                                                    color="white"
                                                />
                                            </View>
                                        )}
                                        <View className="flex-row justify-between items-center mt-2">
                                            <Text className="text-sm font-bold">
                                                {item.source}
                                            </Text>
                                            <View className="w-4 h-4 rounded-full bg-blue-500" />
                                        </View>
                                    </CardContent>
                                </Card>
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
