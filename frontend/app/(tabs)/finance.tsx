import "@/global.css";
import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react-native";
import { Pressable, ScrollView, Text, TextInput, View, Dimensions, Alert, Modal, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PieChart } from "react-native-chart-kit";

type Item = { id: string; name: string; amount: number; timestamp?: number };
type Category = { id: string; name: string; items: Item[] };


export default function FinanceScreen() {
    // State for budget and categories
    const [budget, setBudget] = useState<number>(1200);

    // State for categories and items
    const [categories, setCategories] = useState<Category[]>([
        { id: "c1", name: "Food", items: [{ id: "i1", name: "Groceries", amount: 120, timestamp: Date.now() - 1000 * 60 * 60 * 24 }, { id: "i2", name: "Coffee", amount: 25, timestamp: Date.now() - 1000 * 60 * 30 }] },
        { id: "c2", name: "Entertainment", items: [{ id: "i3", name: "Movies", amount: 45, timestamp: Date.now() - 1000 * 60 * 60 * 5 }] },
        { id: "c3", name: "Transport", items: [{ id: "i4", name: "Gas", amount: 60, timestamp: Date.now() - 1000 * 60 * 60 * 2 }] },
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


    // Modal state for adding a new transaction
    const [modalVisible, setModalVisible] = useState(false);
    const [txAmount, setTxAmount] = useState("");
    const [txDesc, setTxDesc] = useState("");
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(categories[0]?.id ?? null);
    const [newCategoryName, setNewCategoryName] = useState("");
    // Search state for filtering categories
    const [searchQuery, setSearchQuery] = useState("");

    const filteredCategories = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return categories;
        return categories.filter((c) => c.name.toLowerCase().includes(q));
    }, [categories, searchQuery]);

    function openAddTransaction() {
        setTxAmount("");
        setTxDesc("");
        setNewCategoryName("");
        setSelectedCategoryId(categories[0]?.id ?? null);
        setModalVisible(true);
    }

    function saveTransaction() {
        const amount = parseFloat(txAmount) || 0;
        if (!amount || amount <= 0) {
            Alert.alert("Invalid amount", "Please enter a valid amount greater than 0.");
            return;
        }

        let targetCatId = selectedCategoryId;

        // If user provided a new category name, create it
        if (newCategoryName.trim() !== "") {
            const newCatId = Date.now().toString();
            const newCat: Category = { id: newCatId, name: newCategoryName.trim(), items: [] };
            setCategories((prev) => [newCat, ...prev]);
            targetCatId = newCatId;
        }

        if (!targetCatId) {
            Alert.alert("No category", "Please choose or create a category.");
            return;
        }

        const itemId = Date.now().toString();
        const itemName = txDesc.trim() || "Transaction";
    const newItem: Item = { id: itemId, name: itemName, amount, timestamp: Date.now() };

        setCategories((prev) => prev.map((c) => c.id === targetCatId ? { ...c, items: [newItem, ...c.items] } : c));

        setModalVisible(false);
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
        <SafeAreaView className="flex-1 bg-gray-200">
            <ScrollView
                className="p-4"
                contentInsetAdjustmentBehavior="never"
                contentContainerStyle={{ flexGrow: 1, paddingBottom: 48 }}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                showsVerticalScrollIndicator={true}
            >

                <View className="items-center mb-5">
                    <View className="rounded-lg bg-white border border-gray-200 p-4 w-full items-center">
                        {(() => {
                            const remaining = Math.max(budget - totalSpent, 0);
                            const data = [
                                {
                                    name: "Spent",
                                    population: Math.max(totalSpent, 0),
                                    color: percent >= 1 ? "#99d1f5ff" : "#1029b9ff",
                                    legendFontColor: "#000",
                                    legendFontSize: 12,
                                },
                                {
                                    name: "Remaining",
                                    population: remaining,
                                    color: "#63ace0ff",
                                    legendFontColor: "#190a0aff",
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
                                        color: (opacity = 1) => `rgba(0,0,0,${opacity})`,
                                    }}
                                    accessor="population"
                                    backgroundColor="transparent"
                                    paddingLeft="15"
                                    center={[0, 0]}
                                    absolute
                                />
                            );
                        })()}

                        <View className="mt-3 w-full">
                            <Text className="text-gray-700 mb-1">Edit budget</Text>
                            <TextInput
                                keyboardType="numeric"
                                value={String(budget)}
                                onChangeText={(t) => setBudget(Number(t) || 0)}
                                className="rounded border border-gray-200 px-3 py-2 text-black bg-white"
                                placeholder="Set total budget"
                                placeholderTextColor="#9CA3AF"
                            />
                        </View>
                    </View>
                </View>

                {/* Spending categories */}
                <View className="flex-row justify-between items-center mb-3">
                    <View className="flex-row justify-between items-center mb-3">
                        <Pressable onPress={openAddTransaction} className="w-full px-4 py-4 rounded-lg flex-row bg-yellow-500 items-center justify-center">
                            <Plus size={14} color="black" />
                            <Text className="text-black text-lg font-medium ml-2">Add new transaction</Text>
                        </Pressable>
                    </View>
                </View>
                
                {/* Search bar for categories */}
                <View className="mb-3 w-full">
                    <TextInput
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder="Search categories"
                        placeholderTextColor="#9CA3AF"
                        className="rounded-full border border-gray-200 px-3 mb-3 py-3.5 bg-white text-black"
                    />
                </View>

                {/* Add Transaction Modal */}
                <Modal
                    visible={modalVisible}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setModalVisible(false)}
                >
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 justify-end">
                        <View className="bg-white p-4 rounded-t-xl border-t border-gray-200">
                            <Text className="text-lg font-semibold mb-2">Add new transaction</Text>

                            <Text className="text-sm text-gray-700">Amount</Text>
                            <TextInput
                                keyboardType="numeric"
                                value={txAmount}
                                onChangeText={setTxAmount}
                                className="rounded border border-gray-200 px-3 py-2 text-black bg-white mb-3"
                                placeholder="0.00"
                                placeholderTextColor="#9CA3AF"
                            />

                            <Text className="text-sm text-gray-700">Description</Text>
                            <TextInput
                                value={txDesc}
                                onChangeText={setTxDesc}
                                className="rounded border border-gray-200 px-3 py-2 text-black bg-white mb-3"
                                placeholder="Optional description"
                                placeholderTextColor="#9CA3AF"
                            />

                            <Text className="text-sm text-gray-700 mb-2">Choose category (or create new)</Text>
                            <View className="mb-3">
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
                                    {categories.map((c) => (
                                        <Pressable
                                            key={c.id}
                                            onPress={() => { setSelectedCategoryId(c.id); setNewCategoryName(""); }}
                                            className={`px-3 py-2 mr-2 rounded-full ${selectedCategoryId === c.id ? 'bg-primary' : 'bg-gray-100'}`}
                                        >
                                            <Text className={`${selectedCategoryId === c.id ? 'text-white' : 'text-black'}`}>{c.name}</Text>
                                        </Pressable>
                                    ))}
                                </ScrollView>

                                <TextInput
                                    value={newCategoryName}
                                    onChangeText={(t) => { setNewCategoryName(t); if (t.trim() !== '') setSelectedCategoryId(null); }}
                                    className="rounded border border-gray-200 px-3 py-2 text-black bg-white"
                                    placeholder="Or type a new category name"
                                    placeholderTextColor="#9CA3AF"
                                />
                            </View>

                            <View className="flex-row justify-end">
                                <Pressable onPress={() => setModalVisible(false)} className="px-4 py-2 mr-2">
                                    <Text className="text-black">Cancel</Text>
                                </Pressable>
                                <Pressable onPress={saveTransaction} className="bg-primary px-4 py-2 rounded">
                                    <Text className="text-white font-semibold">Save</Text>
                                </Pressable>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </Modal>

                {/* List of categories */}
                {filteredCategories.map((cat) => (
                    <View key={cat.id} className=" mb-4 rounded-md bg-white border border-gray-200">
                        <View className="bg-blue-500 rounded-tl-md rounded-tr-md px-2 py-3 flex-row justify-between items-center mb-2">

                            <View className=" ">
                                <Text className="text-white text-lg">{cat.name}</Text>
                            </View>

                            <View className="flex-row items-center">
                                <Text className="text-white text-lg mr-2">${cat.items.reduce((s, it) => s + it.amount, 0).toFixed(2)}</Text>
                            </View>
                        </View>

                        {cat.items.length === 0 && (
                            <Text className="text-gray-600 mb-2">No items yet. Add one below.</Text>
                        )}
                        {/* List of items */}
                        {cat.items.map((it) => (
                            <View key={it.id} className="flex-row justify-between items-center mb-2 border-s mx-3 border-blue-500 px-2">
                                <View>
                                    <Text className="text-black text-[17px]">{it.name}</Text>
                                    <Text className="text-gray-500 text-sm mt-1">{new Date(it.timestamp ?? 0).toLocaleString()}</Text>
                                </View>
                                <View className="flex-row items-center">
                                    <Text className="text-black text-[17px]"> $ {String(it.amount)} </Text>
                                    <Pressable onPress={() => confirmDeleteItem(cat.id, it.id)} className="ml-2 p-2">
                                        <Trash2 size={14} color="#ef4444" />
                                    </Pressable>
                                </View>
                            </View>
                        ))}
                        {/* Category actions: delete only (add via modal) */}
                        <View className="flex-row items-center mt-2">
                            <Pressable onPress={() => confirmDeleteCategory(cat.id)} className="p-2 bg-gray-100 rounded-full">
                                <Trash2 size={18} color="#ef4444" />
                            </Pressable>
                        </View>

                    </View>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
}

