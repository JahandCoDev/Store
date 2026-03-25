export type CartItem = {
  key: string;
  productId: string;
  quantity: number;
  options?: {
    size?: "S" | "M" | "L";
    color?: "Black" | "White" | "Navy";
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
