import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { ArrowLeftIcon, ShoppingBagIcon } from 'lucide-react-native';
import { router } from 'expo-router';


// --- Mock Data (Kept the same for functionality) ---
const MOCK_RECEIPT_DATA = {
  store: 'iPhone 16 Pro - 2 (Mock Store Name)',
  date: '10/15/2025 14:30',
  totalLocal: 1185.19,
  currencyLocal: 'USD',
  currencyHome: 'EUR',
  exchangeRate: 0.92,
  items: [
    { name: 'Item name 1', quantity: 2, priceLocal: 200.99 },
    { name: 'Item name 2', quantity: 2, priceLocal: 200.99 },
    { name: 'Item name 3', quantity: 2, priceLocal: 200.99 },
  ],
  breakdown: [
    { label: 'Sales Tax', amountLocal: -20.75, type: 'fee' },
    { label: 'Tax Refund', amountLocal: 20.75, type: 'refund' },
    { label: 'Transaction Fee', amountLocal: -20.75, type: 'fee' },
  ],
};


// Helper function to format currency (keep this)
const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  }).format(amount);
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
const ItemRow = ({ name, quantity, priceLocal }: typeof MOCK_RECEIPT_DATA.items[0]) => (
  // Use a transparent background with light grey border for the item box
  <View className={`flex-row items-center justify-between p-3 my-2 bg-card rounded-lg border border-border`}>
    <View className="flex-1 mr-4">
      {/* Font size 18px and black text for item details */}
      <Text className="text-lg font-semibold text-black ">{name}</Text>
      <Text className="text-lg text-gray-500 ">Qty {quantity}</Text>
    </View>
    <Text className="text-lg font-semibold text-right text-black dark:text-white">
      {formatCurrency(priceLocal, MOCK_RECEIPT_DATA.currencyLocal)}
    </Text>
  </View>
);


// --- Component for a Fee/Refund Row ---
const BreakdownRow = ({ label, amountLocal, type }: typeof MOCK_RECEIPT_DATA.breakdown[0]) => {
  const isFee = amountLocal < 0;
  const displayAmount = formatCurrency(Math.abs(amountLocal), MOCK_RECEIPT_DATA.currencyLocal);


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
  const {
    store,
    date,
    totalLocal,
    currencyLocal,
    currencyHome,
    exchangeRate,
    items,
    breakdown,
  } = MOCK_RECEIPT_DATA;


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
            {formatCurrency(totalLocal, currencyLocal).replace(currencyLocal, '')}
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
            <Text className="text-[18px] font-bold text-black dark:text-white mb-1">{store}</Text>
            <Text className="text-[18px] text-gray-500 mb-4">{date}</Text>
           
            {/* Dashed line separator (Light Grey) */}
            <View className={`border-b border-dashed border-border mb-4`} />
           
            <BestWayToPay />
           
            {/* Dashed line separator (Light Grey) */}
            <View className={`border-b border-dashed border-border mb-4`} />




            {/* Item List */}
            {items.map((item, index) => (
              <React.Fragment key={index}>
                <ItemRow {...item} />
                {/* Separator between items (no dashed line needed here, as the box acts as separation) */}
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
                <Text className="text-[18px] font-bold text-black">Total</Text>
                {/* Total amount is 18px, black text */}
                <Text className="text-[18px] font-bold text-black">
                  {formatCurrency(totalLocal, currencyLocal)}
                </Text>
              </View>
              {/* Home Currency Value (Value Gauge) - 18px, black text */}
              <View className="flex-row justify-end items-center">
                <Text className="text-[18px] font-medium text-gray-500">
                  (~{formatCurrency(totalHome, currencyHome)})
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

