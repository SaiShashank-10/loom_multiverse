import { Product, CartItem, User } from './types';

export type AppState = {
  products: Product[];
  cart: CartItem[];
  user: User | null;
};

export type Action = {
  type: string;
  payload?: any;
};

export type Dispatch = (action: Action) => void;

export type RootState = {
  appState: AppState;
};
