import "@/global.css";
import { useMemo, useState } from "react";
import { Plus, Trash2, Search, Edit } from "lucide-react-native";
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

    // (helper removed) update logic handled in edit modal and add transaction flow


    // Modal state for adding a new transaction
    const [modalVisible, setModalVisible] = useState(false);
    const [txAmount, setTxAmount] = useState("");
    const [txDesc, setTxDesc] = useState("");
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(categories[0]?.id ?? null);
    const [newCategoryName, setNewCategoryName] = useState("");
    // Search state for filtering categories
    const [searchQuery, setSearchQuery] = useState("");

    // Category menu + edit modal state
    const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
    const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
    const [editItems, setEditItems] = useState<Item[]>([]);
    const [chartHeight, setChartHeight] = useState<number>(250);
    const [overlayHeight, setOverlayHeight] = useState<number>(0);
    const [budgetEditModalVisible, setBudgetEditModalVisible] = useState(false);
    const [budgetEditValue, setBudgetEditValue] = useState(String(budget));

    const filteredCategories = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return categories;
        return categories.filter((c) => c.name.toLowerCase().includes(q));
    }, [categories, searchQuery]);

    // Open add transaction modal
    function openAddTransaction() {
        setTxAmount("");
        setTxDesc("");
        setNewCategoryName("");
        setSelectedCategoryId(categories[0]?.id ?? null);
        setModalVisible(true);
    }

    // Save new transaction
    function saveTransaction() {
        // Validate amount
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

        // Ensure we have a valid category to add the item to
        if (!targetCatId) {
            Alert.alert("No category", "Please choose or create a category.");
            return;
        }
        // Create new item
        const itemId = Date.now().toString();
        const itemName = txDesc.trim() || "Transaction";
        const newItem: Item = { id: itemId, name: itemName, amount, timestamp: Date.now() };
        // Add item to the selected category
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

    // Close overlay menu
    function closeMenu() {
        setMenuOpenFor(null);
        setMenuPosition(null);
    }

    return (
        <SafeAreaView className="flex-1 bg-gray-50">

            <ScrollView
                className="p-4"
                contentInsetAdjustmentBehavior="never"
                contentContainerStyle={{ flexGrow: 1, paddingBottom: 48 }}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                showsVerticalScrollIndicator={true}
            >

                <View className="items-center mb-5">
                    <View className="rounded-lg bg-gray-200 border border-gray-200 p-4 w-full items-center">
                        {(() => {
                            const remaining = Math.max(budget - totalSpent, 0);
                            const data = [
                                {
                                    name: "Spent",
                                    population: Math.max(totalSpent, 0),
                                    color: percent >= 1 ? "#99d1f5ff" : "#aadbffff",
                                    legendFontColor: "#000",
                                    legendFontSize: 12,
                                },
                                {
                                    name: "Remaining",
                                    population: remaining,
                                    color: "#33BBED",
                                    legendFontColor: "#190a0aff",
                                    legendFontSize: 12,
                                },
                            ];

                            const screenWidth = Math.min(360, Dimensions.get("window").width - 32);

                            return (
                                <View className="w-full items-center" style={{ position: 'relative' }}>

                                    <View onLayout={(e) => setChartHeight(e.nativeEvent.layout.height)}>
                                        <PieChart
                                            data={data}
                                            width={screenWidth}
                                            height={270}
                                            chartConfig={{
                                                backgroundColor: "transparent",
                                                backgroundGradientFrom: "transparent",
                                                backgroundGradientTo: "transparent",
                                                color: (opacity = 1) => `rgba(0,0,0,${opacity})`,
                                            }}
                                            hasLegend={false}
                                            accessor="population"
                                            backgroundColor="transparent"
                                            paddingLeft="90"
                                            center={[0, 0]}
                                            absolute
                                            style={{ alignSelf: 'center' }}
                                        />
                                    </View>


                                    {/* Header row above the chart: budget centered, edit button right (prevents overlapping the pie) */}
                                    <View className="w-full flex-row items-center justify-between px-2 mb-2">
                                        <View style={{ width: 40 }} />
                                        <View className="items-center">
                                            <Text className="text-sm text-gray-700">Budget</Text>
                                            <Text className="text-lg font-semibold">${Number(budget).toFixed(2)}</Text>
                                        </View>
                                        <Pressable
                                            onPress={() => { setBudgetEditValue(String(budget)); setBudgetEditModalVisible(true); }}
                                            style={{ padding: 6, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.65)' }}
                                        >
                                            <Edit size={16} color="#111" />
                                        </Pressable>
                                    </View>
                                    {/* Overlay: Remaining amount on top of the pie (centered dynamically). Width now fits content only */}
                                    <View
                                        className="rounded px-3 py-2"
                                        pointerEvents="none"
                                        onLayout={(e) => setOverlayHeight(e.nativeEvent.layout.height)}
                                        style={{ position: 'absolute', top: Math.max(0, (chartHeight - overlayHeight) / 2), alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.75)' }}
                                    >
                                        <Text className="text-xl font-semibold">${Math.max(remaining, 0).toFixed(2)}</Text>
                                        <Text className="text-sm text-black">Remaining</Text>
                                    </View>

                                    {/* Legend row: Spent and Remaining */}
                                    <View className="flex-row items-center mt-3 ">
                                        <View className="flex-row mr-2 items-center">
                                            <View style={{ width: 10, height: 10, borderRadius: 6, backgroundColor: data[0].color }} />
                                            <View className="ml-2">
                                                <Text className="text-sm text-gray-700">Spent</Text>
                                                <Text className="text-sm font-semibold">${Math.max(totalSpent, 0).toFixed(2)}</Text>
                                            </View>
                                        </View>

                                        <View className="flex-row ml-2 items-center">
                                            <View style={{ width: 10, height: 10, borderRadius: 6, backgroundColor: data[1].color }} />
                                            <View className="ml-2">
                                                <Text className="text-sm text-gray-700">Remaining</Text>
                                                <Text className="text-sm font-semibold">${remaining.toFixed(2)}</Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            );
                        })()}


                    </View>
                </View>

                {/* Spending categories */}
                <View className="flex-row justify-between items-center mb-3">
                    <View className="flex-row justify-between items-center mb-3">
                        <Pressable onPress={openAddTransaction} className="w-full px-4 py-4 rounded-lg flex-row bg-secondary items-center justify-center">
                            <Plus size={14} color="black" />
                            <Text className="text-lg font-medium ml-2">Add new transaction</Text>
                        </Pressable>
                    </View>
                </View>

                {/* Search bar for categories */}
                <View className="mb-5 w-full">
                    <View className="flex-row items-center bg-white border border-gray-300 rounded-full px-3 py-2">
                        <Search size={16} color="#9CA3AF" />
                        <TextInput
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholder="Search categories"
                            placeholderTextColor="#9CA3AF"
                            className="ml-2 flex-1 text-black"
                        />
                    </View>
                </View>

                {/* Add Transaction Modal */}
                <Modal
                    visible={modalVisible}
                    animationType="fade"
                    transparent={true}
                    onRequestClose={() => setModalVisible(false)}
                >
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
                        <Pressable
                            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 }}
                            onPress={() => setModalVisible(false)}
                        >
                            {/* inner Pressable consumes taps so backdrop onPress won't fire when tapping the card */}
                            <Pressable onPress={() => { }} className="bg-white p-4 rounded-lg border border-gray-200 w-full" style={{ maxWidth: 520 }}>
                                <Text className="text-lg font-semibold mb-2">Add new transaction</Text>

                                <Text className="text-sm text-gray-700">Enter Amount</Text>
                                <TextInput
                                    keyboardType="numeric"
                                    value={txAmount}
                                    onChangeText={setTxAmount}
                                    className="rounded border border-gray-200 px-3 py-2 text-black bg-white mb-3"
                                    placeholder="0.00"
                                    placeholderTextColor="#9CA3AF"
                                />

                                <Text className="text-sm text-gray-700">Transaction Description</Text>
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
                            </Pressable>
                        </Pressable>
                    </KeyboardAvoidingView>
                </Modal>

                {/* Budget edit modal (opens when tapping edit icon) */}
                <Modal
                    visible={budgetEditModalVisible}
                    animationType="fade"
                    transparent={true}
                    onRequestClose={() => setBudgetEditModalVisible(false)}
                >
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
                        <Pressable
                            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 }}
                            onPress={() => setBudgetEditModalVisible(false)}
                        >
                            <Pressable onPress={() => { }} className="bg-white p-4 rounded-lg border border-gray-200 w-full" style={{ maxWidth: 420 }}>
                                <Text className="text-lg font-semibold mb-2">Edit budget</Text>
                                <Text className="text-sm text-gray-700 mb-1">Amount</Text>
                                <TextInput
                                    keyboardType="numeric"
                                    value={budgetEditValue}
                                    onChangeText={setBudgetEditValue}
                                    className="rounded border border-gray-200 px-3 py-2 text-black bg-white mb-3"
                                    placeholder="0.00"
                                    placeholderTextColor="#9CA3AF"
                                />

                                <View className="flex-row justify-end">
                                    <Pressable onPress={() => setBudgetEditModalVisible(false)} className="px-4 py-2 mr-2">
                                        <Text className="text-black">Cancel</Text>
                                    </Pressable>
                                    <Pressable onPress={() => { setBudget(Number(budgetEditValue) || 0); setBudgetEditModalVisible(false); }} className="bg-primary px-4 py-2 rounded">
                                        <Text className="text-white font-semibold">Save</Text>
                                    </Pressable>
                                </View>
                            </Pressable>
                        </Pressable>
                    </KeyboardAvoidingView>
                </Modal>

                {/* Overlay menu popup (doesn't push layout) */}
                {menuOpenFor && menuPosition && (
                    <Modal visible={true} transparent animationType="fade" onRequestClose={closeMenu}>
                        <Pressable style={{ flex: 1 }} onPress={closeMenu}>
                            {(() => {
                                const screenW = Dimensions.get('window').width;
                                const menuW = 160;
                                const left = Math.min(Math.max(8, menuPosition.x - menuW + 24), screenW - menuW - 8);
                                const top = menuPosition.y + 8;
                                return (
                                    <View style={{ position: 'absolute', left, top, width: menuW, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 6, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, elevation: 6, backgroundColor: '#fff' }}>
                                        <Pressable
                                            onPress={() => {
                                                const cat = categories.find(c => c.id === menuOpenFor);
                                                closeMenu();
                                                if (cat) {
                                                    setEditingCategoryId(cat.id);
                                                    setEditItems(cat.items.map(i => ({ ...i })));
                                                    setEditModalVisible(true);
                                                }
                                            }}
                                            style={({ pressed }) => [{ backgroundColor: pressed ? '#f3f4f6' : 'transparent', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 6 }]}
                                            className="hover:bg-gray-100"
                                        >
                                            <Text className="text-black">Edit items</Text>
                                        </Pressable>

                                        <Pressable
                                            onPress={() => { const id = menuOpenFor; closeMenu(); if (id) confirmDeleteCategory(id); }}
                                            style={({ pressed }) => [{ backgroundColor: pressed ? '#fee2e2' : 'transparent', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 6, marginTop: 6 }]}
                                            className="hover:bg-red-50"
                                        >
                                            <Text style={{ color: '#dc2626' }}>Delete category</Text>
                                        </Pressable>
                                    </View>
                                );
                            })()}
                        </Pressable>
                    </Modal>
                )}

                {/* Edit items modal (per-category) */}
                <Modal
                    visible={editModalVisible}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setEditModalVisible(false)}
                >
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 justify-end">
                        <View className="bg-white p-4 rounded-t-xl border-t border-gray-200">
                            <Text className="text-lg font-semibold mb-2">Edit items</Text>

                            {editItems.map((it, idx) => (
                                <View key={it.id} className="mb-3">
                                    <Text className="text-sm text-gray-700">Name</Text>
                                    <TextInput
                                        value={it.name}
                                        onChangeText={(v) => setEditItems((prev) => prev.map((e, i) => i === idx ? { ...e, name: v } : e))}
                                        className="rounded border border-gray-200 px-3 py-2 text-black bg-white mb-1"
                                    />
                                    <Text className="text-sm text-gray-700">Amount</Text>
                                    <TextInput
                                        value={String(it.amount)}
                                        keyboardType="numeric"
                                        onChangeText={(v) => setEditItems((prev) => prev.map((e, i) => i === idx ? { ...e, amount: parseFloat(v) || 0 } : e))}
                                        className="rounded border border-gray-200 px-3 py-2 text-black bg-white"
                                    />
                                </View>
                            ))}

                            <View className="flex-row justify-end">
                                <Pressable onPress={() => setEditModalVisible(false)} className="px-4 py-2 mr-2">
                                    <Text className="text-black">Cancel</Text>
                                </Pressable>
                                <Pressable onPress={() => {
                                    if (!editingCategoryId) return setEditModalVisible(false);
                                    setCategories((prev) => prev.map((c) => c.id === editingCategoryId ? { ...c, items: editItems } : c));
                                    setEditModalVisible(false);
                                }} className="bg-primary px-4 py-2 rounded">
                                    <Text className="text-white font-semibold">Save</Text>
                                </Pressable>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </Modal>

                {/* List of categories */}
                {filteredCategories.map((cat) => (
                    <View key={cat.id} className=" mb-4 rounded-md border-gray-300 bg-white border border-gray-100 shadow-sm">
                        <View className="bg-blue-500 rounded-tl-md rounded-tr-md px-2 py-3 flex-row justify-between items-center mb-2">

                            {/* Category name (left) and actions (right: price + three-dots) */}
                            <View className="flex-row items-center">
                                <Text className="text-white text-lg mr-3">{cat.name}</Text>
                            </View>

                            <View className="flex-row items-center">
                                <Text className="text-white text-lg mr-2">${cat.items.reduce((s, it) => s + it.amount, 0).toFixed(2)}</Text>
                                <Pressable
                                    onPressIn={(e: any) => {
                                        const { pageX, pageY } = e.nativeEvent;
                                        setMenuPosition({ x: pageX, y: pageY });
                                        setMenuOpenFor(menuOpenFor === cat.id ? null : cat.id);
                                    }}
                                    className="px-2 py-1"
                                >
                                    <Text className="text-white text-sm">⋯</Text>
                                </Pressable>
                            </View>
                        </View>
                        {/* No items message */}
                        {cat.items.length === 0 && (
                            <Text className="text-muted-foreground mb-2">No items yet. Add one below.</Text>
                        )}
                        {/* List of items */}
                        {cat.items.map((it) => (
                            <View key={it.id} className="flex-row justify-between items-center mb-2 border-s mx-3 border-blue-500 px-2">
                                {/* Item details */}
                                <View>
                                    <Text className="text-black text-[17px]">{it.name}</Text>
                                    <Text className="text-gray-500 text-sm mt-1">{new Date(it.timestamp ?? 0).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
                                </View>
                                <View className="flex-row items-center">
                                    {/* Item amount and delete button */}
                                    <Text className="text-black text-[17px]"> $ {String(it.amount)} </Text>
                                    <Pressable onPress={() => confirmDeleteItem(cat.id, it.id)} className="ml-2 p-2">
                                        <Trash2 size={14} color="#ef4444" />
                                    </Pressable>
                                </View>
                            </View>
                        ))}
                        {/* Category actions: delete only (add via modal) */}


                    </View>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
}
