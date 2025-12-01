import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { ArrowLeftIcon } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useCart } from '@/context/cart-context';
import type { CartItem, Receipt } from '@/types/user';
import { useUser } from '@/hooks/useUser';
import {
  addCategory,
  addTransaction,
  createReceiptForTrip,
  getFinance,
  updateBudget,
} from '@/lib/firebase';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';


type ReceiptItem = {
  id: string;
  name: string;
  quantity: number;
  price: number;
  currency?: string;
};


// Helper function to format currency robustly with code or symbol
const formatAmount = (amount: number | string, currency?: string) => {
  const num = typeof amount === 'number' ? amount : Number(amount);
  if (!Number.isFinite(num)) return '—';
  if (!currency) return `$${num.toFixed(2)}`;
  if (/^[A-Z]{3}$/.test(currency)) {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
      }).format(num);
    } catch {
      // Fallback to symbol-like formatting
      return `${currency}${num.toFixed(2)}`;
    }
  }
  return `${currency}${num.toFixed(2)}`;
};


// Define custom colors using arbitrary values for Tailwind CSS
const COLORS = {
    orange: '#FFB701',
    lightBlue: '#06ADD8',
    red: '#EF4343',
    taxRefundBlue: '#19BACC',
    lightGrey: '#ECEEF0',
};


// --- Component for an Item Row ---
const ItemRow = ({ name, quantity, price, currency }: ReceiptItem) => {
  const unit = formatAmount(price, currency);
  const lineTotal = formatAmount((price || 0) * (quantity || 0), currency);
  return (
  // Use a transparent background with light grey border for the item box
  <View className={`flex-row items-center justify-between p-3 my-2 bg-card rounded-lg border border-border`}>
    <View className="flex-1 mr-4">
      {/* Font size 18px and black text for item details */}
      <Text className="text-lg font-semibold text-black ">{name}</Text>
      <Text className="text-lg text-gray-500 ">Qty {quantity}</Text>
      <Text className="text-base text-gray-600 ">{unit} each</Text>
    </View>
    <Text className="text-lg font-semibold text-right text-black dark:text-white">
      {lineTotal}
    </Text>
  </View>
)};


// --- Component for a Fee/Refund Row ---
const BreakdownRow = ({ label, amountLocal, type }: { label: string; amountLocal: number; type: 'fee' | 'refund' }) => {
  const isFee = amountLocal < 0;
  const displayAmount = formatAmount(Math.abs(amountLocal));


  // Force black text for breakdown rows (labels and amounts)
  const textColor = 'text-black';


  return (
    <View className="flex-row items-center justify-between py-3">
      <View className="flex-row items-center">
        {/* Use a placeholder circle for visual consistency */}
        <View className={`w-3 h-3 rounded-full mr-2 ${type === 'refund' ? 'bg-[${COLORS.taxRefundBlue}]' : 'bg-[${COLORS.red}]'}`} />
        <Text className="text-lg text-black">{label}</Text>
      </View>
      {/* Apply specific color and font size 18px */}
      <Text className={`text-lg font-medium ${textColor}`}>
        {isFee ? '-' : '+'}
        {displayAmount}
      </Text>
    </View>
  );
};


// --- Main Mock Receipt Screen Component ---
export default function MockReceiptScreen() {
  const { userProfile } = useUser();
  const { cartItems } = useCart();
  const params = useLocalSearchParams<{ ids?: string }>();
  const selectedIds = useMemo(() => {
    if (!params?.ids) return null;
    return new Set(params.ids.split(',').filter(Boolean));
  }, [params]);

  const getItemKey = (item: CartItem) => item.tripItemId || (item as any).id;

  const items: ReceiptItem[] = useMemo(() => {
    const base = selectedIds
      ? cartItems.filter((ci) => selectedIds.has(getItemKey(ci)))
      : cartItems;
    return base.map((ci) => ({
      id: getItemKey(ci),
      name: ci.name ?? 'Item',
      quantity: Number(ci.quantity ?? 1) || 1,
      price: Number(ci.price ?? 0) || 0,
      currency: ci.currency,
      homeTax: ci.homeTax ?? false,
    }));
  }, [cartItems, selectedIds]);

  const store = 'Cart Summary';
  const date = new Date().toLocaleString();

  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [finance, setFinance] = useState<{ budget: number; categories?: Array<{ id: string; name: string; items?: any[] }> } | null>(null);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingNewCategory, setCreatingNewCategory] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [txName, setTxName] = useState('Receipt total');
  const selectedCategoryOption = useMemo(() => {
    const cat = finance?.categories?.find((c) => c.id === selectedCategoryId);
    return cat ? {value: cat.id, label: cat.name} : undefined;
  }, [finance?.categories, selectedCategoryId]);

  useEffect(() => {
    async function fetchReceipt() {
      if (!userProfile?.currentTripId) return;
      if (items.length === 0) return;
      const rec = await createReceiptForTrip(userProfile.currentTripId, items);
      setReceipt(rec);
    }
    fetchReceipt();
  }, [userProfile?.currentTripId, params?.ids, cartItems.length]);

  useEffect(() => {
    async function loadFinance() {
      if (!userProfile?.currentTripId) return;
      try {
        const fin = await getFinance(userProfile.currentTripId);
        setFinance(fin);
      } catch (err) {
        console.error('Failed to load finance', err);
      }
    }
    loadFinance();
  }, [userProfile?.currentTripId]);
  
  const currencyLocal = receipt?.currency || 'USD';
  const subtotal = receipt?.subtotal || 0;
  const tax = receipt?.tax || 0;
  const totalLocal = receipt?.total || 0;
  const serviceFee = receipt?.serviceFee || 0;
  const breakdown = serviceFee > 0 ? [
    { label: 'Service Fee', amountLocal: serviceFee, type: 'fee' as const }
  ] : [];
  const taxRate = receipt?.taxRate || 0;
  const currencyHome = 'USD'; // Assume home currency is USD for this mockup
  const exchangeRate = 1.0; // Assume 1:1 for simplicity
  const totalHome = totalLocal * exchangeRate;

  async function handleApplyToBudget() {
    if (!userProfile?.currentTripId || !finance) return;
    if (!creatingNewCategory && !selectedCategoryId) {
      Alert.alert('Pick a category', 'Select a category or choose "Create new category".');
      return;
    }
    if (creatingNewCategory && !newCategoryName.trim()) {
      Alert.alert('Name required', 'Enter a category name.');
      return;
    }

    setSubmitting(true);
    try {
      const tripId = userProfile.currentTripId;
      let catId = selectedCategoryId;
      let createdCat: { id: string; name: string } | null = null;

      if (creatingNewCategory) {
        createdCat = await addCategory(tripId, newCategoryName.trim()) as { id: string; name: string };
        catId = createdCat.id;
      }

      const amount = totalLocal;
      const name = txName.trim() || 'Receipt total';
      const tx = await addTransaction(tripId, catId as string, name, amount);

      const newBudget = Math.max(0, (finance.budget || 0) - amount);
      await updateBudget(tripId, newBudget);

      setFinance((prev) => {
        if (!prev) return prev;
        const categories = [...(prev.categories || [])];
        if (createdCat) {
          categories.unshift({ ...createdCat, items: [] });
        }
        const idx = categories.findIndex((c) => c.id === catId);
        if (idx >= 0) {
          const items = [...(categories[idx].items || [])];
          items.unshift(tx);
          categories[idx] = { ...categories[idx], items };
        }
        return { ...prev, budget: newBudget, categories };
      });

      setCategoryModalOpen(false);
      setSelectedCategoryId(null);
      setNewCategoryName('');
      setCreatingNewCategory(false);
      setTxName('Receipt total');
      router.push('/(tabs)/finance');
    } catch (err) {
      console.error('Failed to apply to budget', err);
      Alert.alert('Budget update failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const BestWayToPay = () => (
    <View className="p-3 my-4 bg-primary/30 rounded-lg border border-yellow-200">
      <Text className="text-lg font-semibold">
        Best Way to Pay:
      </Text>
      <Text className="text-lg">
        Pay in **Cash** to save 5% on transaction fees!
      </Text>
    </View>
  );


  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        {/* --- Top Section (Blue Background) --- */}
        <View className={`pt-12 pb-20 bg-[${COLORS.lightBlue}]`}>
          <View className="px-5 flex-row items-center justify-between">
            {/* Top Left: Back Arrow (White) */}
            <TouchableOpacity onPress={() => router.back()} className="p-2">
              <ArrowLeftIcon size={28} color="white" />
            </TouchableOpacity>


            {/* Top Right: Currency Button (Orange) */}
            <View className={`flex-row items-center px-4 py-2 bg-[${COLORS.orange}] rounded-full shadow-md`}>
              <Text className="text-lg font-bold text-white pr-1">$</Text>
              <Text className="text-lg font-bold text-white">{currencyLocal}</Text>
            </View>
          </View>


          {/* Total Price (White text, 32px) */}
          <Text className="text-[32px] font-bold text-center text-white mt-4">
            {formatAmount(totalLocal, currencyLocal).replace(String(currencyLocal), '')}
          </Text>
        </View>
       
        {/* --- Zig-Zag Separator --- */}
        <View className="relative w-full h-[60px] mt-[-60px]">
            {/* The Zig-Zag shape is created using a large, inverse clip-path on the white background.
                Since React Native doesn't support complex CSS shapes easily, we use a simple,
                visually clean solid white box as the top part of the receipt body that overlaps
                the blue area. For an *actual* zig-zag, you would need an SVG or a custom view component.
                For this implementation, we will simulate the overlap effect as a clean break.
                If you need the exact zig-zag, we'd need to install and use react-native-svg.
            */}
        </View>




        {/* --- Receipt Body (White Background) --- */}
        <View className="px-4 mt-[-60]">
          <View className="bg-background p-4 rounded-t-lg shadow-md">
            {/* Store Name and Date */}
            <Text className="text-[18px] font-bold text-black mb-1">{store}</Text>
            <Text className="text-[18px] text-gray-500 mb-4">{date}</Text>
           
            {/* Dashed line separator (Light Grey) */}
            <View className={`border-b border-dashed border-border mb-4`} />
           
            <BestWayToPay />
           
            {/* Dashed line separator (Light Grey) */}
            <View className={`border-b border-dashed border-border mb-4`} />




            {/* Item List */}
            {items.map((item) => (
              <React.Fragment key={item.id}>
                <ItemRow {...item} />
              </React.Fragment>
            ))}


            {/* Dashed line separator (Light Grey) */}
            <View className={`border-b border-dashed border-[${COLORS.lightGrey}] my-4`} />




            {/* Fees and Taxes Breakdown */}
            {breakdown.map((item, index) => (
              <BreakdownRow key={index} {...item} />
            ))}


            {/* --- Total Section --- */}
            {/* Dashed line separator (Light Grey) */}
            <View className={`border-t border-dashed border-[${COLORS.lightGrey}] mt-6 pt-4`}>
              <View className="flex-row justify-between items-center mb-1">
                <Text className="text-[18px] font-bold text-black">Subtotal</Text>
                <Text className="text-[18px] font-bold text-black">
                  {formatAmount(subtotal, currencyLocal)}
                </Text>
              </View>
              <View className="flex-row justify-between items-center mb-1">
                <Text className="text-[18px] font-bold text-black">Tax ({(taxRate * 100).toFixed(1)}%)</Text>
                <Text className="text-[18px] font-bold text-black">
                  {formatAmount(tax, currencyLocal)}
                </Text>
              </View>
              <View className="flex-row justify-between items-center mb-1">
                <Text className="text-[18px] font-bold text-black">Total</Text>
                {/* Total amount is 18px, black text */}
                <Text className="text-[18px] font-bold text-black">
                  {formatAmount(totalLocal, currencyLocal)}
                </Text>
              </View>
              {/* Home Currency Value (Value Gauge) - 18px, black text */}
              <View className="flex-row justify-end items-center">
                <Text className="text-[18px] font-medium text-gray-500">
                  (~{formatAmount(totalHome, currencyHome)})
                </Text>
              </View>
            </View>
           
            {/* Action Buttons */}
            <View className="mt-6">
              <Text className="text-sm text-gray-600 mb-2">
                Budget: {formatAmount(finance?.budget ?? 0, currencyLocal)}
              </Text>
              <TouchableOpacity
                className="p-4 bg-primary rounded-lg"
                onPress={() => {
                  setTxName('Receipt total');
                  setCategoryModalOpen(true);
                }}
                disabled={!userProfile?.currentTripId || totalLocal <= 0}
              >
                <Text className="text-center text-[18px] font-bold text-white">
                  Add to Budget
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Category picker modal */}
      <Modal visible={categoryModalOpen} animationType="slide" transparent>
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white p-4 rounded-t-2xl">
            <Text className="text-lg font-bold mb-3">Add receipt to a category</Text>

            <Text className="text-sm text-gray-600 mb-2">Choose category</Text>
            <Select
              value={
                creatingNewCategory
                  ? {value: '__new__', label: 'Create new category'}
                  : selectedCategoryOption
              }
              onValueChange={(option) => {
                const id = option?.value ?? null;
                if (id === '__new__') {
                  setCreatingNewCategory(true);
                  setSelectedCategoryId(null);
                } else {
                  setCreatingNewCategory(false);
                  setSelectedCategoryId(id);
                  setNewCategoryName('');
                }
              }}
            >
              <SelectTrigger className="w- border border-border rounded px-3 mb-2 bg-white">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__new__" label="Create new category" />
                {finance?.categories?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id} label={cat.name} />
                ))}
              </SelectContent>
            </Select>

            {creatingNewCategory && (
              <>
                <Text className="mt-2 text-sm text-gray-600">Name your category</Text>
                <TextInput
                  className="mt-2 border border-border rounded p-3"
                  placeholder="New category name"
                  value={newCategoryName}
                  onChangeText={(t) => {
                    setNewCategoryName(t);
                  }}
                />
              </>
            )}
            <Text className="mt-3 text-sm text-gray-600">Transaction name</Text>
            <TextInput
              className="mt-2 border border-border rounded p-3"
              placeholder="Receipt total"
              value={txName}
              onChangeText={setTxName}
            />

            <View className="mt-4 flex-row justify-end gap-3">
              <TouchableOpacity onPress={() => setCategoryModalOpen(false)}>
                <Text className="text-base text-gray-600">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={submitting}
                onPress={handleApplyToBudget}
                className="px-4 py-2 bg-primary rounded"
              >
                <Text className="text-white font-semibold">
                  {submitting ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}


// Optional: You would need to ensure your Tailwind configuration file (tailwind.config.js)
// is set up to allow arbitrary value styling like `bg-[#06ADD8]`.


// Standard StyleSheet is needed if you want complex shapes (like the zig-zag)
// const styles = StyleSheet.create({
//   // If you were using an SVG component for the zigzag:
//   // zigZag: { ... }
// });
