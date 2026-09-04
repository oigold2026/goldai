"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, CircleAlert, Sparkles } from "lucide-react";
import { getFirebaseServices } from "../lib/firebase";
import { creditPackages } from "../lib/credits/packages";
import type { CreditAccount, CreditTransaction } from "../types/credits";
import type { PaymentRecord } from "../types/payments";
import { GoldAILogo, GoldAILogoLoader, ThemeToggle } from "./gold-ai-ui";

function formatAmount(amount: number) { return new Intl.NumberFormat("en-US").format(Math.abs(amount)); }
function transactionLabel(transaction: CreditTransaction) { return transaction.type === "ai_usage" ? "AI usage" : transaction.description || transaction.type.replaceAll("_", " "); }
function paymentLabel(payment: PaymentRecord) { return `${payment.credits} credits purchased`; }
function formatPrice(payment: { amount: number; currency: string }) { return `${payment.currency} ${new Intl.NumberFormat("en-US").format(payment.amount)}`; }

export function CreditsPage() {
  const [account, setAccount] = useState<CreditAccount | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [processingPackage, setProcessingPackage] = useState<string | null>(null);
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);
  const paymentId = useSearchParams().get("payment");

  const loadCredits = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const token = await getFirebaseServices().auth.currentUser?.getIdToken();
      if (!token) throw new Error("Please log in again.");
      const response = await fetch("/api/credits", { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json() as { account?: CreditAccount; transactions?: Record<string, CreditTransaction>; error?: string };
      if (!response.ok || !data.account) throw new Error(data.error || "Unable to verify your credits right now.");
      setAccount(data.account); setTransactions(Object.values(data.transactions || {}).sort((a, b) => b.createdAt - a.createdAt));
      const paymentsResponse = await fetch("/api/payments/pesapal", { headers: { Authorization: `Bearer ${token}` } });
      const paymentsData = await paymentsResponse.json() as { payments?: PaymentRecord[] };
      if (paymentsResponse.ok) setPayments(paymentsData.payments || []);
      if (paymentId) {
        const statusResponse = await fetch(`/api/payments/pesapal?paymentId=${encodeURIComponent(paymentId)}`, { headers: { Authorization: `Bearer ${token}` } });
        const statusData = await statusResponse.json() as { payment?: PaymentRecord };
        const payment = statusData.payment;
        if (payment) setPaymentMessage(payment.status === "completed" ? `Payment successful. +${formatAmount(payment.credits)} credits have been added.` : payment.status === "pending" ? "Payment pending. We're confirming your payment." : `Payment ${payment.status}. No credits were added.`);
      }
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Unable to verify your credits right now."); }
    finally { setLoading(false); }
  }, [paymentId]);

  async function buyPackage(packageId: string) {
    setProcessingPackage(packageId); setPaymentMessage(null);
    try {
      const token = await getFirebaseServices().auth.currentUser?.getIdToken();
      if (!token) throw new Error("Please log in again.");
      const response = await fetch("/api/payments/pesapal", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ packageId }) });
      const data = await response.json() as { redirectUrl?: string; error?: string };
      if (!response.ok || !data.redirectUrl) throw new Error(data.error || "Unable to start payment.");
      window.location.assign(data.redirectUrl);
    } catch (purchaseError) { setPaymentMessage(purchaseError instanceof Error ? purchaseError.message : "Unable to start payment."); setProcessingPackage(null); }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => { void loadCredits(); }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadCredits]);

  return <main className="credits-page"><header className="credits-header"><Link href="/" aria-label="Back to home"><ArrowLeft size={19} /></Link><GoldAILogo compact /><ThemeToggle /></header><section className="credits-panel"><span className="eyebrow">Your Gold AI balance</span><h1>Credits</h1>{loading ? <div className="credits-loading"><GoldAILogoLoader size="lg" label="Loading your credits..." /></div> : error ? <div className="credits-error" role="alert"><CircleAlert size={18} /><span>{error}</span><button type="button" onClick={() => void loadCredits()}>Retry</button></div> : account && <><div className="balance-card"><span className="section-kicker"><Sparkles size={14} /> Available credits</span><strong>{formatAmount(account.balance)}</strong><span>Credits ready to use</span>{account.balance <= 2 && <small className="low-credit">You have {formatAmount(account.balance)} credits left.</small>}</div><div className="credit-breakdown"><div><span>Monthly free</span><strong>{formatAmount(Math.max(0, account.monthlyFreeCredits - account.monthlyFreeUsed))}</strong></div><div><span>Purchased</span><strong>{formatAmount(account.purchasedCredits)}</strong></div><div><span>Used this month</span><strong>{formatAmount(account.monthlyFreeUsed)}</strong></div></div>{paymentMessage && <div className="credits-error" role="alert"><CircleAlert size={18} /><span>{paymentMessage}</span></div>}<section className="credit-packages"><div className="section-title"><div><span className="eyebrow">Top up securely</span><h2>Get more credits</h2></div><span className="section-rule" /></div><div className="package-grid">{creditPackages.filter((creditPackage) => creditPackage.active).map((creditPackage) => <article className="package-card" key={creditPackage.id}><strong>{creditPackage.name}</strong><span className="package-credits">{formatAmount(creditPackage.credits)} credits</span><span className="package-price">{formatPrice(creditPackage)}</span><button className="auth-submit" type="button" disabled={processingPackage !== null} onClick={() => void buyPackage(creditPackage.id)}>{processingPackage === creditPackage.id ? "Processing..." : "Pay with PesaPal"}</button></article>)}</div></section><section className="transactions"><div className="section-title"><div><span className="eyebrow">A clear record</span><h2>Recent activity</h2></div><span className="section-rule" /></div>{transactions.length === 0 && payments.length === 0 ? <p className="transactions-empty">No credit activity yet.</p> : <>{transactions.slice(0, 12).map((transaction) => <div className="transaction" key={transaction.id}><span className={transaction.amount >= 0 ? "transaction-plus" : "transaction-minus"}>{transaction.amount >= 0 ? "+" : "-"}{formatAmount(transaction.amount)}</span><span><strong>{transactionLabel(transaction)}</strong><small>{new Date(transaction.createdAt).toLocaleDateString()}</small></span></div>)}{payments.filter((payment) => payment.status !== "completed").map((payment) => <div className="transaction" key={payment.id}><span className="transaction-pending">{payment.status}</span><span><strong>{paymentLabel(payment)}</strong><small>{formatPrice(payment)}</small></span></div>)}</>}</section></>}</section></main>;
}
