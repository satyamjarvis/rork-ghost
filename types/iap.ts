export interface LetterBombPack {
  id: string;
  productId: string;
  name: string;
  bombs: number;
  price: string;
  priceValue: number;
  description: string;
  popular?: boolean;
  bestValue?: boolean;
}

export const LETTER_BOMB_PACKS: LetterBombPack[] = [
  {
    id: 'bombs_small',
    productId: 'com.pixofactor.ghost.bombs.small',
    name: 'Small Pack',
    bombs: 10,
    price: '$0.99',
    priceValue: 0.99,
    description: '10 Letter Bombs',
  },
  {
    id: 'bombs_medium',
    productId: 'com.pixofactor.ghost.bombs.medium',
    name: 'Medium Pack',
    bombs: 50,
    price: '$3.99',
    priceValue: 3.99,
    description: '50 Letter Bombs',
    popular: true,
  },
  {
    id: 'bombs_large',
    productId: 'com.pixofactor.ghost.bombs.large',
    name: 'Large Pack',
    bombs: 120,
    price: '$7.99',
    priceValue: 7.99,
    description: 'Best value for serious players!',
    bestValue: true,
  },
];

export interface PurchaseResult {
  success: boolean;
  bombs?: number;
  error?: string;
}

export interface IAPState {
  isLoading: boolean;
  isAvailable: boolean;
  products: LetterBombPack[];
}
