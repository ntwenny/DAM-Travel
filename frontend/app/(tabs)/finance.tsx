import "@/global.css";
import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react-native";
import { Pressable, ScrollView, Text, TextInput, View, Dimensions, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PieChart } from "react-native-chart-kit";

type Item = { id: string; name: string; amount: number };
type Category = { id: string; name: string; items: Item[] };


export default function FinanceScreen() {
    // State for budget and categories
    const [budget, setBudget] = useState<number>(1200);

    // State for categories and items
    const [categories, setCategories] = useState<Category[]>([
        { id: "c1", name: "Food", items: [{ id: "i1", name: "Groceries", amount: 120 }, { id: "i2", name: "Coffee", amount: 25 }] },
        { id: "c2", name: "Entertainment", items: [{ id: "i3", name: "Movies", amount: 45 }] },
        { id: "c3", name: "Transport", items: [{ id: "i4", name: "Gas", amount: 60 }] },
    ]);

    // Calculate total spent
    const totalSpent = useMemo(() => {
        return categories.reduce((sum, c) => sum + c.items.reduce((s, it) => s + Number(it.amount || 0), 0), 0);
    }, [categories]);

    // Calculate percent of budget spent
    const percent = useMemo(() => {
        if (!budget || budget <= 0) return 0;
        return Math.min(totalSpent / budget, 1);
    }, [totalSpent, budget]);

    // Update item amount
    function updateItemAmount(catId: string, itemId: string, value: string) {
        const num = parseFloat(value) || 0;
        setCategories((prev) => prev.map((c) => {
            if (c.id !== catId) return c;
            return { ...c, items: c.items.map(it => it.id === itemId ? { ...it, amount: num } : it) };
        }));
    }

    // Add a new item
    function addItem(catId: string) {
        const name = "New item";
        const id = Date.now().toString();
        setCategories((prev) => prev.map((c) => c.id === catId ? { ...c, items: [{ id, name, amount: 0 }, ...c.items] } : c));
    }

    // Add a new category
    function addCategory() {
        const id = Date.now().toString();
        setCategories((prev) => [{ id, name: `Category ${prev.length + 1}`, items: [] }, ...prev]);
    }

    // Delete handlers
    function deleteCategory(catId: string) {
        setCategories((prev) => prev.filter((c) => c.id !== catId));
    }

    // Confirm delete handlers
    function confirmDeleteCategory(catId: string) {
        Alert.alert("Delete category", "Are you sure you want to delete this category and all its items?", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: () => deleteCategory(catId) },
        ]);
    }

    //  Delete item
    function deleteItem(catId: string, itemId: string) {
        setCategories((prev) => prev.map((c) => {
            if (c.id !== catId) return c;
            return { ...c, items: c.items.filter((it) => it.id !== itemId) };
        }));
    }

    // Confirm delete item
    function confirmDeleteItem(catId: string, itemId: string) {
        Alert.alert("Delete item", "Are you sure you want to delete this item?", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: () => deleteItem(catId, itemId) },
        ]);
    }

    return (
        <SafeAreaView className="flex-1 bg-background">
            <ScrollView
                className="p-4"
                contentInsetAdjustmentBehavior="never"
                contentContainerStyle={{ flexGrow: 1, paddingBottom: 48 }}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                showsVerticalScrollIndicator={true}
            >

                <View className="items-center mb-6">
                    <View className="rounded-lg bg-card border border-border p-4 w-full items-center">
                        {(() => {
                            const remaining = Math.max(budget - totalSpent, 0);
                            const data = [
                                {
                                    name: "Spent",
                                    population: Math.max(totalSpent, 0),
                                    color: percent >= 1 ? "#ef4444" : "#10b981",
                                    legendFontColor: "#fff",
                                    legendFontSize: 12,
                                },
                                {
                                    name: "Remaining",
                                    population: remaining,
                                    color: "#2b2b2b",
                                    legendFontColor: "#fff",
                                    legendFontSize: 12,
                                },
                            ];

                            const screenWidth = Math.min(360, Dimensions.get("window").width - 32);

                            return (
                                <PieChart
                                    data={data}
                                    width={screenWidth}
                                    height={200}
                                    chartConfig={{
                                        backgroundColor: "transparent",
                                        backgroundGradientFrom: "transparent",
                                        backgroundGradientTo: "transparent",
                                        color: (opacity = 1) => `rgba(255,255,255,${opacity})`,
                                    }}
                                    accessor="population"
                                    backgroundColor="transparent"
                                    paddingLeft="15"
                                    center={[0, 0]}
                                    absolute
                                />
                            );
                        })()}

                        <Text className="text-muted">Total budget</Text>


                        <View className="mt-3 w-full">
                            <Text className="text-muted mb-1">Edit budget</Text>
                            <TextInput
                                keyboardType="numeric"
                                value={String(budget)}
                                onChangeText={(t) => setBudget(Number(t) || 0)}
                                className="rounded border border-border px-3 py-2 text-foreground bg-background"
                                placeholder="Set total budget"
                                placeholderTextColor="#9CA3AF"
                            />
                        </View>
                    </View>
                </View>

                {/* Spending categories */}
                <View className="flex-row justify-between items-center mb-3">
                    <Text className="text-foreground text-lg font-semibold">Spending categories</Text>
                    <Pressable onPress={addCategory} className="bg-primary px-3 py-2 rounded flex-row items-center">
                        <Plus size={14} color="white" />
                        <Text className="text-white font-semibold ml-2">Add</Text>
                    </Pressable>
                </View>

                {/* List of categories */}
                {categories.map((cat) => (
                    <View key={cat.id} className="mb-4 rounded bg-card border border-border p-3">
                        <View className="flex-row justify-between items-center mb-2">

                            <Text className="text-foreground font-semibold">{cat.name}</Text>

                            <View className="flex-row items-center">
                                <Text className="text-muted mr-2">${cat.items.reduce((s, it) => s + it.amount, 0).toFixed(2)}</Text>

                            </View>
                        </View>

                        {cat.items.length === 0 && (
                            <Text className="text-muted mb-2">No items yet. Add one below.</Text>
                        )}

                        {/* List of items */}
                        {cat.items.map((it) => (
                            <View key={it.id} className="flex-row justify-between items-center mb-2">
                                <Text className="text-foreground">{it.name}</Text>
                                <View className="flex-row items-center">
                                    <TextInput
                                        value={String(it.amount)}
                                        onChangeText={(v) => updateItemAmount(cat.id, it.id, v)}
                                        keyboardType="numeric"
                                        className="w-24 rounded border border-border px-2 py-1 text-foreground bg-background text-right"
                                    />
                                    <Pressable onPress={() => confirmDeleteItem(cat.id, it.id)} className="ml-2 p-2">
                                        <Trash2 size={14} color="#ef4444" />
                                    </Pressable>
                                </View>
                            </View>
                        ))}
                        {/* Add item button */}
                        <View className="flex-row items-center mt-2">
                               <Pressable onPress={() => confirmDeleteCategory(cat.id)} className="p-2 bg-blue-300 rounded-[5px]">
                                   <Trash2 size={18} color="#2626dcff" />
                               </Pressable>

                            <Pressable onPress={() => addItem(cat.id)} className="flex-1 ml-3 rounded bg-primary px-3 py-2 items-center">
                                <Text className="text-white font-semibold">Add item</Text>
                            </Pressable>
                        </View>

                    </View>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
}

