export const paymentStatuses = ["pending", "completed", "failed", "cancelled", "expired"] as const;
export type PaymentStatus = (typeof paymentStatuses)[number];

export type PaymentRecord = {
  id: string;
  userId: string;
  packageId: string;
  amount: number;
  currency: string;
  credits: number;
  status: PaymentStatus;
  merchantReference: string;
  pesapalOrderTrackingId?: string;
  pesapalStatus?: string;
  createdAt: number;
  updatedAt: number;
};
