import React, { useEffect, useMemo, useState } from "react";
import { Alert, Image, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MinusIcon, PlusIcon, Trash2Icon, HeartIcon } from "lucide-react-native";
import { useCart } from "@/context/cart-context";
import { router } from "expo-router";

export default function CartScreen() {
  const { cartItems, updateQuantity, removeFromCart, clearCart } = useCart();
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setSelected((prev) => {
      const next: Record<string, boolean> = {};
      cartItems.forEach((item) => {
        next[item.id] = prev[item.id] ?? true;
      });
      return next;
    });
  }, [cartItems]);

  const selectedItems = useMemo(
    () => cartItems.filter((item) => selected[item.id]),
    [cartItems, selected]
  );

  const total = selectedItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const toggleSelected = (id: string) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="p-4 pb-24" showsVerticalScrollIndicator={false}>
        <View className="mb-5 flex-row items-center justify-between">
          <Text className="text-3xl font-semibold text-foreground">Cart</Text>
          {cartItems.length > 0 && (
            <Pressable onPress={clearCart}>
              <Text className="text-sm font-semibold text-muted-foreground">Clear All</Text>
            </Pressable>
          )}
        </View>

        {cartItems.map((item) => (
          <View
            key={item.id}
            className="mb-4 rounded-3xl bg-card p-4 shadow-sm"
          >
            <View className="flex-row gap-4">
              <Pressable
                onPress={() => toggleSelected(item.id)}
                className="flex-row items-center gap-3"
              >
                <View
                  className={`h-6 w-6 items-center justify-center rounded-md border-2 ${
                    selected[item.id]
                      ? "bg-primary border-primary"
                      : "border-border bg-card"
                  }`}
                >
                  {selected[item.id] && (
                    <Text className="text-xs font-bold text-white">✓</Text>
                  )}
                </View>
                <Image
                  source={{ uri: item.image }}
                  className="h-20 w-20 rounded-2xl bg-popover"
                  resizeMode="cover"
                />
              </Pressable>
              <View className="flex-1">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-2">
                    <Text className="text-lg font-semibold text-foreground">
                      {item.name}
                    </Text>
                    <Text className="text-sm text-muted-foreground">${item.price.toFixed(2)}</Text>
                    {item.status && (
                      <Text
                        className={`text-xs font-semibold ${
                          item.status === "in-stock"
                            ? "text-emerald-500"
                            : item.status === "shipping"
                            ? "text-amber-500"
                            : "text-rose-500"
                        }`}
                      >
                        {item.status === "in-stock"
                          ? "In Stock"
                          : item.status === "shipping"
                          ? item.info || "Available soon"
                          : "Out of stock"}
                      </Text>
                    )}
                  </View>
                  <Text className="text-lg font-semibold text-foreground">
                    ${(item.price * item.quantity).toFixed(2)}
                  </Text>
                </View>

                <View className="mt-3 flex-row flex-wrap items-center gap-2">
                  {item.size && (
                    <View className="rounded-full border border-border px-3 py-1">
                      <Text className="text-xs font-medium text-foreground">{item.size}</Text>
                    </View>
                  )}
                  {item.color && (
                    <View className="rounded-full border border-border px-3 py-1">
                      <Text className="text-xs font-medium text-foreground">{item.color}</Text>
                    </View>
                  )}
                  <View className="ml-auto flex-row items-center rounded-full border border-border bg-card">
                    <Pressable
                      className="px-3 py-1"
                      onPress={() => updateQuantity(item.id, item.quantity - 1)}
                    >
                      <MinusIcon size={16} color="#0f172a" />
                    </Pressable>
                    <Text className="w-8 text-center text-base font-semibold">
                      {item.quantity}
                    </Text>
                    <Pressable
                      className="px-3 py-1"
                      onPress={() => updateQuantity(item.id, item.quantity + 1)}
                    >
                      <PlusIcon size={16} color="#0f172a" />
                    </Pressable>
                  </View>
                </View>

                <View className="mt-4 flex-row items-center gap-6">
                  <Pressable className="flex-row items-center gap-1">
                    <HeartIcon size={16} color="#9ca3af" />
                    <Text className="text-sm text-muted-foreground">Save</Text>
                  </Pressable>
                  <Pressable
                    className="flex-row items-center gap-1"
                    onPress={() => removeFromCart(item.id)}
                  >
                    <Trash2Icon size={16} color="#f43f5e" />
                    <Text className="text-sm" style={{ color: 'rgb(var(--destructive))' }}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        ))}

        {cartItems.length === 0 && (
          <View className="items-center justify-center rounded-3xl bg-card p-8 shadow-sm">
            <Text className="text-base text-muted-foreground">Your cart is empty.</Text>
          </View>
        )}
      </ScrollView>

      <View className="absolute inset-x-0 bottom-0 border-t border-border bg-card p-4">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-sm text-muted-foreground">
              Selected ({selectedItems.length})
            </Text>
            <Text className="text-2xl font-semibold text-foreground">
              ${total.toFixed(2)}
            </Text>
          </View>
          <Pressable
            className={`rounded-full px-6 py-3 ${
              selectedItems.length > 0
                ? "bg-primary"
                : "bg-secondary"
            }`}
            disabled={selectedItems.length === 0}
            onPress={() => {
              if (selectedItems.length === 0) {
                Alert.alert("Select items", "Please select at least one item to checkout.");
                return;
              }
              router.push("/mock-receipt");
            }}
          >
            <Text className="text-base font-semibold text-primary-foreground">
              Calculate
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
