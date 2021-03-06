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
          throw 'Quantidade solicitada fora de estoque';
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
      
      if (!amount) throw 'Quantidade solicitada fora de estoque';

      const { data } = await api.get<Product>(`/products/${productId}`);

      const newCart = [...cart, { ...data, amount: 1 }];

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      setCart(oldState => newCart);
      
    } catch (error: string | any) {
      if (typeof error === 'string') {
        toast.error(error);
        return;
      }
      
      toast.error('Erro na adi????o do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productIndex = cart.findIndex(product => product.id === productId);
      const newCart = [...cart];

      if (productIndex >= 0) {
        newCart.splice(productIndex, 1);
      } else {
        throw 'Erro na remo????o do produto'
      }
      
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      setCart(oldState => newCart);

    } catch (error: string | any) {
      if (typeof error === 'string') {
        toast.error(error);
        return;
      }
      
      toast.error('Erro na remo????o do produto');
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
        throw 'Quantidade solicitada fora de estoque';
      }
      
      const newCart = cart.map(product => {
        if (product.id === productId) product.amount = amount;
        return product;
      });

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      setCart(oldState => newCart);
      
    } catch (error: string | any) {
      if (typeof error === 'string') {
        toast.error(error);
        return;
      }

      toast.error('Erro na altera????o de quantidade do produto');
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
