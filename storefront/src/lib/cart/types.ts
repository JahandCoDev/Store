export type CartItem = {
  key: string;
  productId: string;
  variantId?: string | null;
  quantity: number;
  options?: {
    size?: string;
    color?: string;
    backDesign?: {
      enabled: boolean;
      designNumber?: number | null;
    };
    specialText?: {
      enabled: boolean;
      front: boolean;
      back: boolean;
      text: string;
      frontPos?: { x: number; y: number };
      backPos?: { x: number; y: number };
    };
  };
};

export type CartState = {
  items: CartItem[];
};
