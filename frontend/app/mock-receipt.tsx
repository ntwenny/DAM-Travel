import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { ArrowLeftIcon, ShoppingBagIcon } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useCart } from '@/context/cart-context';
import type { CartItem } from '@/types/user';
// No backend calls here; compute a simple local tax.


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
    }));
  }, [cartItems, selectedIds]);

  const store = 'Cart Summary';
  const date = new Date().toLocaleString();
  const currencyLocal = items.find((i) => !!i.currency)?.currency || 'USD';
  const subtotal = items.reduce((sum, i) => sum + (i.price || 0) * (i.quantity || 0), 0);
  const TAX_RATE = 0.03; // 3%
  const tax = subtotal * TAX_RATE;
  const totalLocal = subtotal + tax;
  const breakdown: Array<{ label: string; amountLocal: number; type: 'fee' | 'refund' }> = [];
  const currencyHome = currencyLocal;
  const exchangeRate = 1;
  const totalHome = totalLocal * exchangeRate;


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
                <Text className="text-[18px] font-bold text-black">Tax (3%)</Text>
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
            <TouchableOpacity className="mt-6 p-4 bg-blue-600 rounded-lg bg-primary">
                <Text className="text-center text-[18px] font-bold text-white">
                    Add to Shopping Bag
                </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
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

