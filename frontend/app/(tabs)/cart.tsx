import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
    MinusIcon,
    PlusIcon,
    Trash2Icon,
    HeartIcon,
    CheckIcon,
    ShoppingCartIcon,
    CalculatorIcon,
} from "lucide-react-native";
import { useCart } from "@/context/cart-context";
import { router } from "expo-router";
import type { CartItem } from "@/types/user";

import { Text } from "@/components/ui/text";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

export default function CartScreen() {
    const { cartItems, updateQuantity, removeFromCart, clearCart, loading } =
        useCart();
    const [selected, setSelected] = useState<Record<string, boolean>>({});

    const getItemKey = useCallback(
        (item: CartItem) => item.tripItemId || item.id,
        []
    );

    useEffect(() => {
        setSelected((prev) => {
            const next: Record<string, boolean> = {};
            cartItems.forEach((item) => {
                const key = getItemKey(item);
                next[key] = prev[key] ?? true;
            });
            return next;
        });
    }, [cartItems, getItemKey]);

    const selectedItems = useMemo(
        () =>
            cartItems.filter((item) => {
                const key = getItemKey(item);
                return selected[key];
            }),
        [cartItems, selected, getItemKey]
    );

    const total = selectedItems.reduce(
        (sum, item) => sum + (item.price || 0) * (item.quantity || 0),
        0
    );

    const toggleSelected = (id: string) => {
        setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const handleUpdateQuantity = (id: string, quantity: number) => {
        if (quantity < 1) {
            handleRemove(id);
            return;
        }
        updateQuantity(id, quantity).catch((error) => {
            Alert.alert(
                "Cart error",
                error instanceof Error ? error.message : "Please try again."
            );
        });
    };

    const handleRemove = (id: string) => {
        removeFromCart(id).catch((error) => {
            Alert.alert(
                "Cart error",
                error instanceof Error ? error.message : "Please try again."
            );
        });
    };

    const handleClear = () => {
        clearCart().catch((error) => {
            Alert.alert(
                "Cart error",
                error instanceof Error ? error.message : "Please try again."
            );
        });
    };

    return (
        <SafeAreaView className="flex-1 bg-background">
            <ScrollView
                contentContainerClassName="p-4 pb-24"
                showsVerticalScrollIndicator={false}
            >
                <View className="mb-5 flex-row items-center justify-between">
                    <View className="flex flex-row gap-x-4">
                        <ShoppingCartIcon className="mr-2 text-foreground" />
                        <Text className="font-[JosefinSans-Bold] text-xl font-semibold text-foreground">
                            Cart
                        </Text>
                    </View>
                    {cartItems.length > 0 && (
                        <Button variant="link" onPress={handleClear}>
                            <Text className="font-['JosefinSans-Regular']">
                                Clear All
                            </Text>
                        </Button>
                    )}
                </View>

                {loading && (
                    <View className="mb-4 items-center">
                        <ActivityIndicator />
                    </View>
                )}

                {cartItems.map((item) => {
                    const key = getItemKey(item);
                    const imageSource = item.thumbnail
                        ? { uri: item.thumbnail }
                        : {
                              uri: "https://via.placeholder.com/80x80.png?text=Item",
                          };
                    return (
                        <Card key={key} className="mb-4">
                            <CardContent className="p-4">
                                <View className="flex-row gap-4">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-20 w-20 items-center justify-center"
                                        onPress={() => toggleSelected(key)}
                                    >
                                        <View className="relative">
                                            <Image
                                                source={imageSource}
                                                className="h-20 w-20 rounded-2xl bg-popover"
                                                resizeMode="cover"
                                            />
                                            <View
                                                className={`absolute -right-1 -top-1 h-6 w-6 items-center justify-center rounded-full border-2 border-background ${
                                                    selected[key]
                                                        ? "bg-primary"
                                                        : "bg-muted"
                                                }`}
                                            >
                                                {selected[key] && (
                                                    <Icon
                                                        as={CheckIcon}
                                                        className="text-primary-foreground"
                                                        size={14}
                                                    />
                                                )}
                                            </View>
                                        </View>
                                    </Button>
                                    <View className="flex-1">
                                        <View className="flex-row items-start justify-between">
                                            <View className="flex-1 pr-2">
                                                <Text className="font-[JosefinSans-Regular] text-lg font-semibold text-foreground">
                                                    {item.name}
                                                </Text>
                                                <Text className="font-[JosefinSans-Regular] text-lg text-muted-foreground">
                                                    {item.currency
                                                        ? `${item.currency} `
                                                        : "$"}
                                                    {(item.price || 0).toFixed(
                                                        2
                                                    )}
                                                </Text>
                                            </View>
                                        </View>

                                        <View className="mt-3 flex-row items-center justify-end">
                                            <View className="flex-row items-center justify-end rounded-full border border-border bg-card">
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 items-center justify-center"
                                                    onPress={() =>
                                                        handleUpdateQuantity(
                                                            key,
                                                            (item.quantity ||
                                                                1) - 1
                                                        )
                                                    }
                                                >
                                                    <Icon as={MinusIcon} />
                                                </Button>
                                                <Text className="font-['JosefinSans-Regular'] w-8 text-center text-base font-semibold">
                                                    {item.quantity || 1}
                                                </Text>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 justify-center"
                                                    onPress={() =>
                                                        handleUpdateQuantity(
                                                            key,
                                                            (item.quantity ||
                                                                0) + 1
                                                        )
                                                    }
                                                >
                                                    <Icon as={PlusIcon} />
                                                </Button>
                                            </View>
                                        </View>

                                        <View className="mt-4 flex-row justify-end gap-4">
                                            <Button
                                                variant="secondary"
                                                className="gap-1"
                                            >
                                                <Icon
                                                    as={HeartIcon}
                                                    className="text-muted-foreground"
                                                />
                                                <Text className="font-['JosefinSans-Regular'] text-muted-foreground">
                                                    Save
                                                </Text>
                                            </Button>
                                            <Button
                                                variant="default"
                                                className="gap-1"
                                                onPress={() =>
                                                    handleRemove(key)
                                                }
                                            >
                                                <Icon
                                                    as={Trash2Icon}
                                                    className="text-destructive"
                                                />
                                                <Text className="font-['JosefinSans-Regular'] text-destructive">
                                                    Delete
                                                </Text>
                                            </Button>
                                        </View>
                                    </View>
                                </View>
                            </CardContent>
                        </Card>
                    );
                })}

                {!loading && cartItems.length === 0 && (
                    <Card>
                        <CardContent className="p-8">
                            <Text className="font-[JosefinSans-Regular] text-center text-muted-foreground">
                                Your cart is empty.
                            </Text>
                        </CardContent>
                    </Card>
                )}
            </ScrollView>

            <View className="absolute inset-x-0 bottom-0 border-t border-border bg-card p-4">
                <View className="flex-row items-center justify-between">
                    <View>
                        <Text className="font-['JosefinSans-Regular'] text-sm text-muted-foreground">
                            Selected ({selectedItems.length})
                        </Text>
                        <Text className="font-['JosefinSans-Regular'] text-2xl font-semibold text-foreground">
                            ${total.toFixed(2)}
                        </Text>
                    </View>
                    <Button
                        size="lg"
                        disabled={selectedItems.length === 0}
                        onPress={() => {
                            if (selectedItems.length === 0) {
                                Alert.alert(
                                    "Select items",
                                    "Please select at least one item to checkout."
                                );
                                return;
                            }
                            const selectedKeys = selectedItems.map((item) =>
                                getItemKey(item)
                            );
                            router.push({
                                pathname: "/mock-receipt",
                                params: { ids: selectedKeys.join(",") },
                            });
                        }}
                    >
                        <CalculatorIcon color="white" className="mr-2" />
                        <Text className="font-['JosefinSans-Regular']">
                            Calculate
                        </Text>
                    </Button>
                </View>
            </View>
        </SafeAreaView>
    );
}
