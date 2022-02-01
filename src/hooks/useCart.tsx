import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const cartProduct = cart.find(product => product.id === productId);
      
      /*
       * Product exists
       */
      if (cartProduct) {
        const { amount } = await getStockProduct(productId);
        
        if (cartProduct.amount >= amount) {
          throw new Error('Quantidade solicitada fora de estoque');
        }
        
        const newCart = cart.map(product => {
          if (product.id === productId) product.amount++;
          return product;
        });
        
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
        setCart(oldState => newCart);
        return;
      }
      
      /*
       * Product not exists
       */
      const { amount } = await getStockProduct(productId);
      
      if (!amount) {
        throw new Error('Quantidade solicitada fora de estoque')
      }

      const { data } = await api.get<Product>(`/products/${productId}`);

      const newCart = [...cart, { ...data, amount: 1 }];

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      setCart(oldState => newCart);
      
    } catch (error: string | any) {
      toast.error(error);
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const newCart = cart.filter(product => product.id !== productId);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      setCart(oldState => newCart);
    } catch {
      toast.error('Algo errado aconteceu, informe o suporte.');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;

      const { amount: amountStock } = await getStockProduct(productId);

      if (amountStock < amount) {
        throw new Error('Quantidade solicitada fora de estoque')
      }
      
      const newCart = cart.map(product => {
        if (product.id === productId) product.amount = amount;
        return product;
      });

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      setCart(oldState => newCart);
      
    } catch (error: string | any) {
      toast.error(error);
    }
  }

  async function getStockProduct(productId: number): Promise<Stock> {
    const { data } = await api.get<Stock>(`/stock/${productId}`);
    return data
  }

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
