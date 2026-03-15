import { useState, useEffect, useCallback } from 'react';
import type { CartItem } from '../../types/pretix';

interface Cart {
  id: string | null;
  items: CartItem[];
}

const CART_STORAGE_KEY = 'pretix_cart';

export function useCart() {
  const [cart, setCart] = useState<Cart>(() => {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    return stored ? JSON.parse(stored) : { id: null, items: [] };
  });

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  const addItem = useCallback((item: CartItem) => {
    setCart((prev) => {
      const existingIndex = prev.items.findIndex(
        (i) => i.item === item.item && i.variation === item.variation
      );

      if (existingIndex >= 0) {
        const newItems = [...prev.items];
        return { ...prev, items: newItems };
      }

      return {
        ...prev,
        items: [...prev.items, { ...item, id: Date.now() }],
      };
    });
  }, []);

  const removeItem = useCallback((itemId: number) => {
    setCart((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== itemId),
    }));
  }, []);

  const updateItem = useCallback((itemId: number, updates: Partial<CartItem>) => {
    setCart((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === itemId ? { ...item, ...updates } : item
      ),
    }));
  }, []);

  const clearCart = useCallback(() => {
    setCart({ id: null, items: [] });
    localStorage.removeItem(CART_STORAGE_KEY);
  }, []);

  const setCartId = useCallback((id: string) => {
    setCart((prev) => ({ ...prev, id }));
  }, []);

  const getTotal = useCallback(() => {
    return cart.items.reduce((sum, item) => {
      return sum + parseFloat(item.price);
    }, 0);
  }, [cart.items]);

  const getItemCount = useCallback(() => {
    return cart.items.length;
  }, [cart.items]);

  return {
    cart,
    addItem,
    removeItem,
    updateItem,
    clearCart,
    setCartId,
    getTotal,
    getItemCount,
  };
}
