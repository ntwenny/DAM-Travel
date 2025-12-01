import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import type { CartItem, TripItem } from "@/types/user";
import {
    addCartItemToTrip,
    clearCartItems,
    getCart,
    removeCartItemFromTrip,
    updateCartQuantity,
    updateCartItemHomeTax,
} from "@/lib/firebase";
import { useUser } from "@/hooks/useUser";

type CartContextValue = {
    cartItems: CartItem[];
    loading: boolean;
    refreshCart: () => Promise<void>;
    addToCart: (
        item: TripItem,
        quantity?: number,
        tripIdOverride?: string
    ) => Promise<void>;
    removeFromCart: (tripItemId: string) => Promise<void>;
    clearCart: () => Promise<void>;
    updateQuantity: (tripItemId: string, quantity: number) => Promise<void>;
    updateHomeTax: (tripItemId: string, homeTax: boolean) => Promise<void>;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
    const { userProfile } = useUser();
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(false);
    // Enforce scoping strictly to the user's selected currentTripId.
    // If none is set, we consider there is no active trip.
    const activeTripId = userProfile?.currentTripId ?? null;

    const refreshCart = useCallback(async () => {
        if (!activeTripId) {
            setCartItems([]);
            return;
        }
        setLoading(true);
        try {
            const res = await getCart(activeTripId);
            setCartItems(res.items ?? []);
        } catch (error) {
            console.warn("Failed to load cart", error);
            setCartItems([]);
        } finally {
            setLoading(false);
        }
    }, [activeTripId]);

    useEffect(() => {
        refreshCart();
    }, [refreshCart]);

    const addToCart = useCallback(
        async (item: TripItem, quantity = 1, tripIdOverride?: string) => {
            const tripId = tripIdOverride ?? activeTripId;
            if (!tripId) {
                throw new Error("Select a trip before adding items to cart.");
            }
            const added = await addCartItemToTrip(
                tripId,
                item.id,
                quantity
            );
            setCartItems((prev) => {
                const idx = prev.findIndex(
                    (entry) => entry.tripItemId === added.tripItemId
                );
                if (idx >= 0) {
                    const next = [...prev];
                    next[idx] = { ...next[idx], ...added };
                    return next;
                }
                return [added, ...prev];
            });
        },
        [activeTripId]
    );

    const removeFromCart = useCallback(
        async (tripItemId: string) => {
            if (!activeTripId) {
                throw new Error("No active trip to remove from.");
            }
            await removeCartItemFromTrip(activeTripId, tripItemId);
            setCartItems((prev) =>
                prev.filter((item) => item.tripItemId !== tripItemId)
            );
        },
        [activeTripId]
    );

    const clearCart = useCallback(async () => {
        if (!activeTripId) {
            return;
        }
        await clearCartItems(activeTripId);
        setCartItems([]);
    }, [activeTripId]);

    const updateQuantity = useCallback(
        async (tripItemId: string, quantity: number) => {
            if (!activeTripId) {
                throw new Error("No active trip to update.");
            }
            if (quantity <= 0) {
                await removeFromCart(tripItemId);
                return;
            }
            const updated = await updateCartQuantity(
                activeTripId,
                tripItemId,
                quantity
            );
            setCartItems((prev) => {
                const idx = prev.findIndex(
                    (entry) => entry.tripItemId === updated.tripItemId
                );
                if (idx === -1) {
                    return prev;
                }
                const next = [...prev];
                next[idx] = { ...next[idx], ...updated };
                return next;
            });
        },
        [activeTripId, removeFromCart]
    );

    const updateHomeTax = useCallback(
      async (tripItemId: string, homeTax: boolean) => {
          if (!activeTripId) {
              throw new Error("No active trip to update.");
          }
          await updateCartItemHomeTax(
              activeTripId,
              tripItemId,
              homeTax
          );
          setCartItems((prev) => {
              const idx = prev.findIndex(
                  (entry) => entry.tripItemId === tripItemId
              );
              if (idx === -1) {
                  return prev;
              }
              const next = [...prev];
              next[idx] = { ...next[idx], homeTax };
              return next;
          });
      },
      [activeTripId]
  );

    const value = useMemo(
        () => ({
            cartItems,
            loading,
            refreshCart,
            addToCart,
            removeFromCart,
            clearCart,
            updateQuantity,
            updateHomeTax,
        }),
        [
            cartItems,
            loading,
            refreshCart,
            addToCart,
            removeFromCart,
            clearCart,
            updateQuantity,
            updateHomeTax,
        ]
    );

    return (
        <CartContext.Provider value={value}>{children}</CartContext.Provider>
    );
}

export function useCart() {
    const ctx = useContext(CartContext);
    if (!ctx) {
        throw new Error("useCart must be used within a CartProvider");
    }
    return ctx;
}
