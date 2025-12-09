import "@/global.css";
import { useMemo, useState, useEffect } from "react";
import {
    Plus,
    Trash2,
    Search,
    Edit,
    DollarSignIcon,
} from "lucide-react-native";
import {
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
    Dimensions,
    Alert,
    Modal,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Svg, Circle } from "react-native-svg";
import {
    getFinance,
    updateBudget as updateBudgetBackend,
    addCategory as addCategoryBackend,
    deleteCategory as deleteCategoryBackend,
    addTransaction as addTransactionBackend,
    deleteTransaction as deleteTransactionBackend,
    editTransaction as editTransactionBackend,
    auth,
    observeAuthState,
} from "@/lib/firebase";
import { useUser } from "@/hooks/useUser";
import { useCurrency } from "@/context/currency-context";
import { getCurrencySymbol } from "@/lib/utils";

type Item = { id: string; name: string; amount: number; timestamp?: number };
type Category = { id: string; name: string; items: Item[] };

// Circular Progress Component
const CircularProgress = ({
    spent,
    total,
    totalSpentDisplay,
    currencySymbol = "$",
    size = 220,
    strokeWidth = 20,
}: {
    spent: number;
    total: number;
    totalSpentDisplay: number;
    currencySymbol?: string;
    size?: number;
    strokeWidth?: number;
}) => {
    const percentage = Math.min((spent / total) * 100, 100);
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <View
            className="items-center justify-center"
            style={{ width: size, height: size }}
        >
            {/* Background circle (light gray) */}
            <Svg width={size} height={size} style={{ position: "absolute" }}>
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="#ECEEF0"
                    strokeWidth={strokeWidth}
                    fill="none"
                />
            </Svg>

            {/* Progress circle (blue) */}
            <Svg
                width={size}
                height={size}
                style={{
                    position: "absolute",
                    transform: [{ rotate: "-90deg" }],
                }}
            >
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="#06ADD8"
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                />
            </Svg>

            {/* Center text */}
            <View className="items-center justify-center">
                <Text className="text-3xl font-[JosefinSans-Bold] text-black">
                    {currencySymbol}
                    {totalSpentDisplay.toFixed(2)}
                </Text>
                <Text className="text-base font-[JosefinSans-Bold] text-gray-500 mt-1">
                    Spent
                </Text>
            </View>
        </View>
    );
};

export default function FinanceScreen() {
    // State for budget and categories
    const [budget, setBudget] = useState<number>(0);
    const [categories, setCategories] = useState<Category[]>([]);

    // Loading and auth state
    const [loading, setLoading] = useState(true);
    const { user, userProfile } = useUser();
    const {
        convertAmount,
        displayCurrency,
        setBaseCurrency,
        setDisplayCurrency,
    } = useCurrency();
    const currentTripId = userProfile?.currentTripId;

    // Calculate total spent
    const totalSpent = useMemo(() => {
        return categories.reduce(
            (sum, c) =>
                sum + c.items.reduce((s, it) => s + Number(it.amount || 0), 0),
            0
        );
    }, [categories]);
    const totalSpentDisplay = convertAmount(totalSpent);

    // Get currency symbol
    const currencySymbol = getCurrencySymbol(displayCurrency);

    // Calculate percent of budget spent
    const percent = useMemo(() => {
        if (!budget || budget <= 0) return 0;
        return Math.min(totalSpent / budget, 1);
    }, [totalSpent, budget]);

    // Modal state for adding a new transaction
    const [modalVisible, setModalVisible] = useState(false);
    const [txAmount, setTxAmount] = useState("");
    const [txDesc, setTxDesc] = useState("");
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
        categories[0]?.id ?? null
    );
    const [newCategoryName, setNewCategoryName] = useState("");
    // Search state for filtering categories
    const [searchQuery, setSearchQuery] = useState("");

    // Load finance data when user is authenticated and has a current trip
    useEffect(() => {
        if (!user || !currentTripId) {
            setLoading(false);
            return;
        }

        async function loadFinance() {
            try {
                setLoading(true);

                console.log("Loading finance data for trip:", currentTripId);
                const financeData = await getFinance(currentTripId as string);
                console.log("Finance data loaded:", financeData);

                setBudget(financeData.budget || 0);
                setCategories(financeData.categories || []);
                // Set the first category as selected if available
                if (
                    financeData.categories &&
                    financeData.categories.length > 0
                ) {
                    setSelectedCategoryId(financeData.categories[0].id);
                }
            } catch (err: any) {
                console.error("Failed to load finance data:", err);
                console.error(
                    `Error details: ${err.message} (code: ${err.code})`
                );
                Alert.alert(
                    "Error",
                    `Failed to load finance data: ${err.message || "Unknown error"}`
                );
            } finally {
                setLoading(false);
            }
        }

        loadFinance();
    }, [user, currentTripId]);

    // Category menu + edit modal state
    const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
    const [menuPosition, setMenuPosition] = useState<{
        x: number;
        y: number;
    } | null>(null);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
        null
    );
    const [editItems, setEditItems] = useState<Item[]>([]);
    const [budgetEditModalVisible, setBudgetEditModalVisible] = useState(false);
    const [budgetEditValue, setBudgetEditValue] = useState(String(budget));

    const filteredCategories = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return categories;
        return categories.filter((c) => c.name.toLowerCase().includes(q));
    }, [categories, searchQuery]);

    // Sync currency base/display when trip changes
    useEffect(() => {
        if (userProfile?.currentTripId) {
            // Base currency is always USD since items are stored in USD
            setBaseCurrency("USD");

            // Set display currency to home currency from user profile
            const homeCurrency = userProfile?.homeCountry
                ? (
                      {
                          US: "USD",
                          FR: "EUR",
                          GB: "GBP",
                          JP: "JPY",
                          CA: "CAD",
                          AU: "AUD",
                          CN: "CNY",
                          IN: "INR",
                      } as const
                  )[userProfile.homeCountry] || "USD"
                : "USD";
            setDisplayCurrency(homeCurrency);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userProfile?.currentTripId]); // Only depend on trip ID, not the setter functions

    // Hard-coded header colors for the first three categories (by original order)
    const categoryHeaderColors = [
        "rgb(249,140,31)", // orange
        "rgb(6, 173, 216)", // emerald/teal
        "rgb(255, 183, 1)", // indigo
    ];

    function headerBgFor(catId: string) {
        const idx = categories.findIndex((c) => c.id === catId);
        const i = idx >= 0 ? idx % categoryHeaderColors.length : 0;
        return categoryHeaderColors[i];
    }

    // Open add transaction modal
    function openAddTransaction() {
        setTxAmount("");
        setTxDesc("");
        setNewCategoryName("");
        setSelectedCategoryId(categories[0]?.id ?? null);
        setModalVisible(true);
    }

    // Save new transaction
    async function saveTransaction() {
        if (!currentTripId) {
            Alert.alert("No trip selected", "Please select a trip first.");
            return;
        }

        // Validate amount
        const amount = parseFloat(txAmount) || 0;
        if (!amount || amount <= 0) {
            Alert.alert(
                "Invalid amount",
                "Please enter a valid amount greater than 0."
            );
            return;
        }

        try {
            let targetCatId = selectedCategoryId;

            // If user provided a new category name, create it
            if (newCategoryName.trim() !== "") {
                const newCat = await addCategoryBackend(
                    currentTripId,
                    newCategoryName.trim()
                );
                setCategories((prev) => [newCat, ...prev]);
                targetCatId = newCat.id;
            }

            // Ensure we have a valid category to add the item to
            if (!targetCatId) {
                Alert.alert(
                    "No category",
                    "Please choose or create a category."
                );
                return;
            }

            // Create new item via backend
            const itemName = txDesc.trim() || "Transaction";
            const newItem = await addTransactionBackend(
                currentTripId,
                targetCatId,
                itemName,
                amount
            );

            // Add item to the selected category in local state
            setCategories((prev) =>
                prev.map((c) =>
                    c.id === targetCatId
                        ? { ...c, items: [newItem, ...c.items] }
                        : c
                )
            );
            setModalVisible(false);
        } catch (err) {
            console.error("Failed to save transaction:", err);
            Alert.alert("Error", "Failed to save transaction");
        }
    }

    // Delete handlers
    async function deleteCategory(catId: string) {
        if (!currentTripId) {
            Alert.alert("No trip selected", "Please select a trip first.");
            return;
        }

        try {
            await deleteCategoryBackend(currentTripId, catId);
            setCategories((prev) => prev.filter((c) => c.id !== catId));
        } catch (err) {
            console.error("Failed to delete category:", err);
            Alert.alert("Error", "Failed to delete category");
        }
    }

    // Confirm delete handlers
    function confirmDeleteCategory(catId: string) {
        Alert.alert(
            "Delete category",
            "Are you sure you want to delete this category and all its items?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => deleteCategory(catId),
                },
            ]
        );
    }

    //  Delete item
    async function deleteItem(catId: string, itemId: string) {
        if (!currentTripId) {
            Alert.alert("No trip selected", "Please select a trip first.");
            return;
        }

        try {
            await deleteTransactionBackend(currentTripId, catId, itemId);
            setCategories((prev) =>
                prev.map((c) => {
                    if (c.id !== catId) return c;
                    return {
                        ...c,
                        items: c.items.filter((it) => it.id !== itemId),
                    };
                })
            );
        } catch (err) {
            console.error("Failed to delete item:", err);
            Alert.alert("Error", "Failed to delete item");
        }
    }

    // Confirm delete item
    function confirmDeleteItem(catId: string, itemId: string) {
        Alert.alert(
            "Delete item",
            "Are you sure you want to delete this item?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => deleteItem(catId, itemId),
                },
            ]
        );
    }

    // Close overlay menu
    function closeMenu() {
        setMenuOpenFor(null);
        setMenuPosition(null);
    }

    // Show loading indicator while fetching data
    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-background items-center justify-center">
                <ActivityIndicator size="large" color="#06ADD8" />
                <Text className="text-gray-500 font-[JosefinSans-Bold] mt-4">
                    Loading finance data...
                </Text>
            </SafeAreaView>
        );
    }

    // Show message if user is not authenticated or no trip selected
    if (!user) {
        return (
            <SafeAreaView className="flex-1 bg-background items-center justify-center">
                <Text className="text-gray-500 font-[JosefinSans-Bold]">
                    Please sign in to view finance data
                </Text>
            </SafeAreaView>
        );
    }

    if (!currentTripId) {
        return (
            <SafeAreaView className="flex-1 bg-background items-center justify-center">
                <Text className="text-gray-500 font-[JosefinSans-Bold]">
                    Please select a trip to view finance data
                </Text>
            </SafeAreaView>
        );
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
                {/* Budget Overview Card */}
                <View className="items-center mb-5">
                    <View className="rounded-xl bg-card border border-border p-6 w-full items-center">
                        {/* Header with Budget and Edit Button */}
                        <View className="w-full flex-row items-center justify-between mb-4">
                            <View style={{ width: 40 }} />
                            <View className="items-center">
                                <Text className="text-sm font-[JosefinSans-Bold] text-gray-500">
                                    Monthly budget
                                </Text>
                                <Text className="text-2xl font-[JosefinSans-Bold] text-black">
                                    {currencySymbol}
                                    {Number(convertAmount(budget)).toFixed(2)}
                                </Text>
                            </View>
                            <Pressable
                                onPress={() => {
                                    setBudgetEditValue(String(budget));
                                    setBudgetEditModalVisible(true);
                                }}
                                style={{
                                    padding: 8,
                                    borderRadius: 20,
                                    backgroundColor: "rgba(0,0,0,0.05)",
                                }}
                            >
                                <Edit size={18} color="#111" />
                            </Pressable>
                        </View>

                        {/* Circular Progress Indicator */}
                        <CircularProgress
                            spent={totalSpent}
                            total={budget}
                            totalSpentDisplay={totalSpentDisplay}
                            currencySymbol={currencySymbol}
                        />

                        {/* Remaining Amount */}
                        <View className="flex-row items-center mt-6">
                            <Text className="text-base font-[JosefinSans-Bold] text-gray-700 mr-2">
                                Left to spend:
                            </Text>
                            <Text
                                className="text-xl font-[JosefinSans-Bold]"
                                style={{ color: "#06ADD8" }}
                            >
                                {currencySymbol}
                                {Number(
                                    convertAmount(
                                        Math.max(budget - totalSpent, 0)
                                    )
                                ).toFixed(2)}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Add Transaction Button */}
                <View className="flex-row justify-between items-center mb-3">
                    <View className="flex-row justify-between items-center mb-3">
                        <Pressable
                            onPress={openAddTransaction}
                            className="w-full px-4 py-4 rounded-lg flex-row bg-gray-300 border border-border items-center justify-center"
                        >
                            <Plus size={28} color="black" />
                            <Text className="text-lg font-[JosefinSans-Bold] ml-2">
                                Add new transaction
                            </Text>
                        </Pressable>
                    </View>
                </View>

                {/* Search bar for categories */}
                <View className="mb-5 w-full">
                    <View className="flex-row items-center bg-white border border-gray-300 rounded-full px-3 py-3">
                        <Search size={16} color="#9CA3AF" />
                        <TextInput
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            className="ml-2 flex-1 text-black py-0"
                            textAlignVertical="center"
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
                    <KeyboardAvoidingView
                        behavior={Platform.OS === "ios" ? "padding" : "height"}
                        className="flex-1"
                    >
                        <Pressable
                            style={{
                                flex: 1,
                                backgroundColor: "rgba(0,0,0,0.4)",
                                justifyContent: "center",
                                alignItems: "center",
                                paddingHorizontal: 16,
                            }}
                            onPress={() => setModalVisible(false)}
                        >
                            <Pressable
                                onPress={() => {}}
                                className="bg-white p-4 rounded-lg border border-gray-200 w-full"
                                style={{ maxWidth: 520 }}
                            >
                                <View className="flex-row justify-center">
                                    <DollarSignIcon />
                                    <Text className="text-lg font-[JosefinSans-Bold] gap-x-2 mb-2">
                                        Add new transaction
                                    </Text>
                                </View>

                                <Text className="text-sm font-[JosefinSans-Bold] text-gray-700">
                                    Enter Amount
                                </Text>
                                <TextInput
                                    keyboardType="numeric"
                                    value={txAmount}
                                    onChangeText={setTxAmount}
                                    className="rounded border font-[JosefinSans-Bold] border-gray-200 px-3 py-2 text-black bg-white mb-3"
                                    placeholder="0.00"
                                    placeholderTextColor="#9CA3AF"
                                />

                                <Text className="text-sm font-[JosefinSans-Bold] text-gray-700">
                                    Transaction Description
                                </Text>
                                <TextInput
                                    value={txDesc}
                                    onChangeText={setTxDesc}
                                    className="rounded border font-[JosefinSans-Bold] border-gray-200 px-3 py-2 text-black bg-white mb-3"
                                    placeholder="Optional description"
                                    placeholderTextColor="#9CA3AF"
                                />

                                <Text className="text-sm font-[JosefinSans-Bold] text-gray-700 mb-2">
                                    Choose category (or create new)
                                </Text>
                                <View className="mb-3">
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        className="mb-2"
                                    >
                                        {categories.map((c) => (
                                            <Pressable
                                                key={c.id}
                                                onPress={() => {
                                                    setSelectedCategoryId(c.id);
                                                    setNewCategoryName("");
                                                }}
                                                className={`px-3 py-2 mr-2 rounded-full ${selectedCategoryId === c.id ? "bg-primary" : "bg-gray-100"}`}
                                            >
                                                <Text
                                                    className={`font-[JosefinSans-Bold] ${selectedCategoryId === c.id ? "text-white" : "text-black"}`}
                                                >
                                                    {c.name}
                                                </Text>
                                            </Pressable>
                                        ))}
                                    </ScrollView>

                                    <TextInput
                                        value={newCategoryName}
                                        onChangeText={(t) => {
                                            setNewCategoryName(t);
                                            if (t.trim() !== "")
                                                setSelectedCategoryId(null);
                                        }}
                                        className="rounded border font-[JosefinSans-Bold] border-gray-200 px-3 py-2 text-black bg-white"
                                        placeholder=" Or type a new category name"
                                        placeholderTextColor="#9CA3AF"
                                    />
                                </View>

                                <View className="flex-row justify-end">
                                    <Pressable
                                        onPress={() => setModalVisible(false)}
                                        className="px-4 py-2 mr-2"
                                    >
                                        <Text className="text-black">
                                            Cancel
                                        </Text>
                                    </Pressable>
                                    <Pressable
                                        onPress={saveTransaction}
                                        className="bg-primary px-4 py-2 rounded"
                                    >
                                        <Text className="text-white font-semibold">
                                            Save
                                        </Text>
                                    </Pressable>
                                </View>
                            </Pressable>
                        </Pressable>
                    </KeyboardAvoidingView>
                </Modal>

                {/* Budget edit modal */}
                <Modal
                    visible={budgetEditModalVisible}
                    animationType="fade"
                    transparent={true}
                    onRequestClose={() => setBudgetEditModalVisible(false)}
                >
                    <KeyboardAvoidingView
                        behavior={Platform.OS === "ios" ? "padding" : "height"}
                        className="flex-1"
                    >
                        <Pressable
                            style={{
                                flex: 1,
                                backgroundColor: "rgba(0,0,0,0.4)",
                                justifyContent: "center",
                                alignItems: "center",
                                paddingHorizontal: 16,
                            }}
                            onPress={() => setBudgetEditModalVisible(false)}
                        >
                            <Pressable
                                onPress={() => {}}
                                className="bg-white p-4 rounded-lg border border-gray-200 w-full"
                                style={{ maxWidth: 420 }}
                            >
                                <Text className="text-lg font-[JosefinSans-Bold] mb-2">
                                    Edit budget
                                </Text>
                                <Text className="text-sm font-[JosefinSans-Bold] text-gray-700 mb-1">
                                    Amount
                                </Text>
                                <TextInput
                                    keyboardType="numeric"
                                    value={budgetEditValue}
                                    onChangeText={setBudgetEditValue}
                                    className="rounded font-[JosefinSans-Bold] border border-gray-200 px-3 py-2 text-black bg-white mb-3"
                                    placeholder="0.00"
                                    placeholderTextColor="#9CA3AF"
                                />

                                <View className="flex-row justify-end">
                                    <Pressable
                                        onPress={() =>
                                            setBudgetEditModalVisible(false)
                                        }
                                        className="px-4 py-2 mr-2"
                                    >
                                        <Text className="text-black">
                                            Cancel
                                        </Text>
                                    </Pressable>
                                    <Pressable
                                        onPress={async () => {
                                            if (!currentTripId) {
                                                Alert.alert(
                                                    "No trip selected",
                                                    "Please select a trip first."
                                                );
                                                return;
                                            }

                                            try {
                                                const newBudget =
                                                    Number(budgetEditValue) ||
                                                    0;
                                                await updateBudgetBackend(
                                                    currentTripId,
                                                    newBudget
                                                );
                                                setBudget(newBudget);
                                                setBudgetEditModalVisible(
                                                    false
                                                );
                                            } catch (err) {
                                                console.error(
                                                    "Failed to update budget:",
                                                    err
                                                );
                                                Alert.alert(
                                                    "Error",
                                                    "Failed to update budget"
                                                );
                                            }
                                        }}
                                        className="bg-primary px-4 py-2 rounded"
                                    >
                                        <Text className="text-white font-semibold">
                                            Save
                                        </Text>
                                    </Pressable>
                                </View>
                            </Pressable>
                        </Pressable>
                    </KeyboardAvoidingView>
                </Modal>

                {/* Overlay menu popup */}
                {menuOpenFor && menuPosition && (
                    <Modal
                        visible={true}
                        transparent
                        animationType="fade"
                        onRequestClose={closeMenu}
                    >
                        <Pressable style={{ flex: 1 }} onPress={closeMenu}>
                            {(() => {
                                const screenW = Dimensions.get("window").width;
                                const menuW = 160;
                                const left = Math.min(
                                    Math.max(8, menuPosition.x - menuW + 24),
                                    screenW - menuW - 8
                                );
                                const top = menuPosition.y + 8;
                                return (
                                    <View
                                        style={{
                                            position: "absolute",
                                            left,
                                            top,
                                            width: menuW,
                                            borderRadius: 8,
                                            paddingVertical: 6,
                                            paddingHorizontal: 6,
                                            shadowColor: "#000",
                                            shadowOpacity: 0.12,
                                            shadowRadius: 8,
                                            elevation: 6,
                                            backgroundColor: "#fff",
                                        }}
                                    >
                                        <Pressable
                                            onPress={() => {
                                                const cat = categories.find(
                                                    (c) => c.id === menuOpenFor
                                                );
                                                closeMenu();
                                                if (cat) {
                                                    setEditingCategoryId(
                                                        cat.id
                                                    );
                                                    setEditItems(
                                                        cat.items.map((i) => ({
                                                            ...i,
                                                        }))
                                                    );
                                                    setEditModalVisible(true);
                                                }
                                            }}
                                            style={({ pressed }) => [
                                                {
                                                    backgroundColor: pressed
                                                        ? "#f3f4f6"
                                                        : "transparent",
                                                    paddingVertical: 8,
                                                    paddingHorizontal: 10,
                                                    borderRadius: 6,
                                                },
                                            ]}
                                            className="hover:bg-gray-100"
                                        >
                                            <Text className="text-black">
                                                Edit items
                                            </Text>
                                        </Pressable>

                                        <Pressable
                                            onPress={() => {
                                                const id = menuOpenFor;
                                                closeMenu();
                                                if (id)
                                                    confirmDeleteCategory(id);
                                            }}
                                            style={({ pressed }) => [
                                                {
                                                    backgroundColor: pressed
                                                        ? "#fee2e2"
                                                        : "transparent",
                                                    paddingVertical: 8,
                                                    paddingHorizontal: 10,
                                                    borderRadius: 6,
                                                    marginTop: 6,
                                                },
                                            ]}
                                            className="hover:bg-red-50"
                                        >
                                            <Text style={{ color: "#dc2626" }}>
                                                Delete category
                                            </Text>
                                        </Pressable>
                                    </View>
                                );
                            })()}
                        </Pressable>
                    </Modal>
                )}

                {/* Edit items modal */}
                <Modal
                    visible={editModalVisible}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setEditModalVisible(false)}
                >
                    <KeyboardAvoidingView
                        behavior={Platform.OS === "ios" ? "padding" : "height"}
                        className="flex-1 justify-end"
                    >
                        <View className="bg-white p-4 rounded-t-xl border-t border-gray-200">
                            <Text className="text-lg font-semibold mb-2">
                                Edit items
                            </Text>

                            {editItems.map((it, idx) => (
                                <View key={it.id} className="mb-3">
                                    <Text className="text-sm text-gray-700">
                                        Name
                                    </Text>
                                    <TextInput
                                        value={it.name}
                                        onChangeText={(v) =>
                                            setEditItems((prev) =>
                                                prev.map((e, i) =>
                                                    i === idx
                                                        ? { ...e, name: v }
                                                        : e
                                                )
                                            )
                                        }
                                        className="rounded border border-gray-200 px-3 py-2 text-black bg-white mb-1"
                                    />
                                    <Text className="text-sm text-gray-700">
                                        Amount
                                    </Text>
                                    <TextInput
                                        value={String(it.amount)}
                                        keyboardType="numeric"
                                        onChangeText={(v) =>
                                            setEditItems((prev) =>
                                                prev.map((e, i) =>
                                                    i === idx
                                                        ? {
                                                              ...e,
                                                              amount:
                                                                  parseFloat(
                                                                      v
                                                                  ) || 0,
                                                          }
                                                        : e
                                                )
                                            )
                                        }
                                        className="rounded border border-gray-200 px-3 py-2 text-black bg-white"
                                    />
                                </View>
                            ))}

                            <View className="flex-row justify-end">
                                <Pressable
                                    onPress={() => setEditModalVisible(false)}
                                    className="px-4 py-2 mr-2"
                                >
                                    <Text className="text-black">Cancel</Text>
                                </Pressable>
                                <Pressable
                                    onPress={async () => {
                                        if (!editingCategoryId)
                                            return setEditModalVisible(false);
                                        if (!currentTripId) {
                                            Alert.alert(
                                                "No trip selected",
                                                "Please select a trip first."
                                            );
                                            return;
                                        }

                                        try {
                                            // Update each item in the backend
                                            for (const item of editItems) {
                                                await editTransactionBackend(
                                                    currentTripId,
                                                    editingCategoryId,
                                                    item
                                                );
                                            }

                                            // Update local state
                                            setCategories((prev) =>
                                                prev.map((c) =>
                                                    c.id === editingCategoryId
                                                        ? {
                                                              ...c,
                                                              items: editItems,
                                                          }
                                                        : c
                                                )
                                            );
                                            setEditModalVisible(false);
                                        } catch (err) {
                                            console.error(
                                                "Failed to update items:",
                                                err
                                            );
                                            Alert.alert(
                                                "Error",
                                                "Failed to update items"
                                            );
                                        }
                                    }}
                                    className="bg-primary px-4 py-2 rounded"
                                >
                                    <Text className="text-white font-semibold">
                                        Save
                                    </Text>
                                </Pressable>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </Modal>

                {/* List of categories */}
                {filteredCategories.map((cat) => (
                    <View
                        key={cat.id}
                        className=" mb-4 rounded-md border-gray-300 bg-white border border-gray-100 shadow-sm"
                    >
                        <View
                            style={{ backgroundColor: headerBgFor(cat.id) }}
                            className="rounded-tl-md rounded-tr-md px-2 py-3 flex-row justify-between items-center mb-2"
                        >
                            <View className="flex-row items-center">
                                <Text className="text-white text-lg mr-3">
                                    {cat.name}
                                </Text>
                            </View>

                            <View className="flex-row items-center">
                                <Text className="text-white text-lg mr-2">
                                    {currencySymbol}
                                    {convertAmount(
                                        cat.items.reduce(
                                            (s, it) => s + it.amount,
                                            0
                                        )
                                    ).toFixed(2)}
                                </Text>
                                <Pressable
                                    onPressIn={(e: any) => {
                                        const { pageX, pageY } = e.nativeEvent;
                                        setMenuPosition({ x: pageX, y: pageY });
                                        setMenuOpenFor(
                                            menuOpenFor === cat.id
                                                ? null
                                                : cat.id
                                        );
                                    }}
                                    className="px-2 py-1"
                                >
                                    <Text className="text-white text-sm">
                                        ⋯
                                    </Text>
                                </Pressable>
                            </View>
                        </View>

                        {cat.items.length === 0 && (
                            <Text className="text-muted-foreground mb-2 px-3">
                                No items yet. Add one above.
                            </Text>
                        )}

                        {cat.items.map((it) => (
                            <View
                                key={it.id}
                                className="flex-row justify-between items-center mb-2 border-s mx-3 border-blue-500 px-2"
                            >
                                <View>
                                    <Text className="text-black text-[17px]">
                                        {it.name}
                                    </Text>
                                    <Text className="text-gray-500 text-sm mt-1">
                                        {new Date(
                                            it.timestamp ?? 0
                                        ).toLocaleString([], {
                                            year: "numeric",
                                            month: "short",
                                            day: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </Text>
                                </View>
                                <View className="flex-row items-center">
                                    <Text className="text-black text-[17px]">
                                        {currencySymbol}
                                        {convertAmount(it.amount).toFixed(2)}
                                    </Text>
                                    <Pressable
                                        onPress={() =>
                                            confirmDeleteItem(cat.id, it.id)
                                        }
                                        className="ml-2 p-2"
                                    >
                                        <Trash2 size={14} color="#ef4444" />
                                    </Pressable>
                                </View>
                            </View>
                        ))}
                    </View>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
}
