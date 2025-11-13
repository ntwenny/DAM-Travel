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
    <SafeAreaView className="flex-1 bg-[#f3f5f9]">
      <ScrollView contentContainerClassName="p-4 pb-24" showsVerticalScrollIndicator={false}>
        <View className="mb-5 flex-row items-center justify-between">
          <Text className="text-3xl font-semibold text-[#0d2645]">Cart</Text>
          {cartItems.length > 0 && (
            <Pressable onPress={clearCart}>
              <Text className="text-sm font-semibold text-rose-500">Clear All</Text>
            </Pressable>
          )}
        </View>

        {cartItems.map((item) => (
          <View
            key={item.id}
            className="mb-4 rounded-3xl bg-white p-4 shadow-sm shadow-[#b9c6d880]"
          >
            <View className="flex-row gap-4">
              <Pressable
                onPress={() => toggleSelected(item.id)}
                className="flex-row items-center gap-3"
              >
                <View
                  className={`h-6 w-6 items-center justify-center rounded-md border-2 ${
                    selected[item.id]
                      ? "bg-[#00a0d6] border-[#00a0d6]"
                      : "border-[#cbd5f0] bg-white"
                  }`}
                >
                  {selected[item.id] && (
                    <Text className="text-xs font-bold text-white">✓</Text>
                  )}
                </View>
                <Image
                  source={{ uri: item.image }}
                  className="h-20 w-20 rounded-2xl bg-[#e8ecf5]"
                  resizeMode="cover"
                />
              </Pressable>
              <View className="flex-1">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-2">
                    <Text className="text-lg font-semibold text-[#111827]">
                      {item.name}
                    </Text>
                    <Text className="text-sm text-[#6b7280]">${item.price.toFixed(2)}</Text>
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
                  <Text className="text-lg font-semibold text-[#111827]">
                    ${(item.price * item.quantity).toFixed(2)}
                  </Text>
                </View>

                <View className="mt-3 flex-row flex-wrap items-center gap-2">
                  {item.size && (
                    <View className="rounded-full border border-[#d5dae3] px-3 py-1">
                      <Text className="text-xs font-medium text-[#111827]">{item.size}</Text>
                    </View>
                  )}
                  {item.color && (
                    <View className="rounded-full border border-[#d5dae3] px-3 py-1">
                      <Text className="text-xs font-medium text-[#111827]">{item.color}</Text>
                    </View>
                  )}
                  <View className="ml-auto flex-row items-center rounded-full border border-[#d5dae3] bg-white">
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
                    <Text className="text-sm text-[#6b7280]">Save</Text>
                  </Pressable>
                  <Pressable
                    className="flex-row items-center gap-1"
                    onPress={() => removeFromCart(item.id)}
                  >
                    <Trash2Icon size={16} color="#f43f5e" />
                    <Text className="text-sm text-[#f43f5e]">Delete</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        ))}

        {cartItems.length === 0 && (
          <View className="items-center justify-center rounded-3xl bg-white p-8 shadow-sm">
            <Text className="text-base text-[#6b7280]">Your cart is empty.</Text>
          </View>
        )}
      </ScrollView>

      <View className="absolute inset-x-0 bottom-0 border-t border-white/40 bg-white p-4">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-sm text-[#6b7280]">
              Selected ({selectedItems.length})
            </Text>
            <Text className="text-2xl font-semibold text-[#111827]">
              ${total.toFixed(2)}
            </Text>
          </View>
          <Pressable
            className={`rounded-full px-6 py-3 ${
              selectedItems.length > 0
                ? "bg-[#00a0d6]"
                : "bg-[#cfd8e9]"
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
            <Text className="text-base font-semibold text-white">
              Calculate
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
