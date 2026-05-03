
import express, { Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();

// Lazy Supabase client initialization
let _supabase: any = null;
const getSupabase = () => {
  if (!_supabase) {
    const url = process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    
    if (!url || !key) {
      console.error("CRITICAL: Supabase environment variables are missing.");
    }
    
    _supabase = createClient(url || "", key || "");
  }
  return _supabase;
};

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Logger
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/api')) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  }
  next();
});

// Payme Handler
const paymeHandler = async (req: Request, res: Response) => {
  console.log(`[Payme] Incoming Path: ${req.path}, OriginalUrl: ${req.originalUrl}`);
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'GET') {
    return res.json({ 
      status: "Payme API is active", 
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString(),
      note: "This is the endpoint you must put in Payme Cabinet"
    });
  }

  const { method, params, id } = req.body || {};
  const authHeader = req.headers.authorization;

  if (!method) {
    return res.json({ id, error: { code: -32600, message: "Invalid Request (missing method)" } });
  }

  const paymeKey = process.env.PAYME_KEY;
  if (!paymeKey) {
    return res.json({ id, error: { code: -32504, message: "Server configuration error" } });
  }

  const expectedAuth = `Basic ${Buffer.from(`Paycom:${paymeKey}`).toString('base64')}`;
  if (!authHeader || authHeader !== expectedAuth) {
    return res.json({ id, error: { code: -32504, message: "Error auth" } });
  }

  try {
    switch (method) {
      case "CheckPerformTransaction": return await handleCheckPerform(params, id, res);
      case "CreateTransaction": return await handleCreateTransaction(params, id, res);
      case "PerformTransaction": return await handlePerformTransaction(params, id, res);
      case "CancelTransaction": return await handleCancelTransaction(params, id, res);
      case "CheckTransaction": return await handleCheckTransaction(params, id, res);
      case "GetStatement": return await handleGetStatement(params, id, res);
      default: return res.json({ id, error: { code: -32601, message: "Method not found" } });
    }
  } catch (err) {
    console.error("Payme API Error:", err);
    return res.json({ id, error: { code: -31008, message: "Internal Error" } });
  }
};

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", env: { node_env: process.env.NODE_ENV } });
});

app.get("/api", (req, res) => {
  res.json({ message: "Vercel API is live", path: req.path });
});

app.all(["/api/payme", "/api/payme/", "/payme", "/payme/"], paymeHandler);

// --- Payme Helpers (simplified for transfer) ---

async function handleCheckPerform(params: any, id: any, res: any) {
  if (!params?.account?.order_id) return res.json({ id, error: { code: -31050, message: "Order ID missing" } });
  const supabase = getSupabase();
  const { data: payment } = await supabase.from('payments').select('*').eq('order_id', params.account.order_id).maybeSingle();
  if (!payment) return res.json({ id, error: { code: -31050, message: "Order not found" } });
  if (Number(payment.amount) !== Number(params.amount)) return res.json({ id, error: { code: -31050, message: "Incorrect amount" } });
  return res.json({ id, result: { allow: true, detail: { order_id: params.account.order_id, description: "Premium" } } });
}

async function handleCreateTransaction(params: any, id: any, res: any) {
  const { id: paymeId, time, account } = params;
  const supabase = getSupabase();
  const { data: payment } = await supabase.from('payments').select('*').eq('order_id', account.order_id).maybeSingle();
  if (!payment) return res.json({ id, error: { code: -31050, message: "Order not found" } });
  if (payment.payme_transaction_id && payment.payme_transaction_id !== paymeId) return res.json({ id, error: { code: -31099, message: "Transaction already exists" } });
  await supabase.from('payments').update({ payme_transaction_id: paymeId, status: 'pending', payme_time: time }).eq('order_id', account.order_id);
  return res.json({ id, result: { create_time: Number(time), transaction: payment.id.toString(), state: 1 } });
}

async function handlePerformTransaction(params: any, id: any, res: any) {
  const { id: paymeId } = params;
  const supabase = getSupabase();
  const { data: payment } = await supabase.from('payments').select('*').eq('payme_transaction_id', paymeId).maybeSingle();
  if (!payment) return res.json({ id, error: { code: -31003, message: "Transaction not found" } });
  if (payment.status === 'paid') return res.json({ id, result: { perform_time: new Date(payment.updated_at).getTime(), transaction: payment.id.toString(), state: 2 } });
  const months = payment.package_type === '1_month' ? 1 : payment.package_type === '3_months' ? 3 : 6;
  const { data: profile } = await supabase.from('profiles').select('subscription_expires_at').eq('id', payment.user_id).single();
  let newExpiryDate = new Date();
  if (profile?.subscription_expires_at && new Date(profile.subscription_expires_at) > new Date()) newExpiryDate = new Date(profile.subscription_expires_at);
  newExpiryDate.setMonth(newExpiryDate.getMonth() + months);
  await supabase.from('profiles').update({ subscription_tier: 'PREMIUM', subscription_expires_at: newExpiryDate.toISOString() }).eq('id', payment.user_id);
  const now = Date.now();
  await supabase.from('payments').update({ status: 'paid', updated_at: new Date(now).toISOString() }).eq('id', payment.id);
  return res.json({ id, result: { perform_time: now, transaction: payment.id.toString(), state: 2 } });
}

async function handleCancelTransaction(params: any, id: any, res: any) {
  const { id: paymeId, reason } = params;
  const supabase = getSupabase();
  const { data: payment } = await supabase.from('payments').select('*').eq('payme_transaction_id', paymeId).maybeSingle();
  if (!payment) return res.json({ id, error: { code: -31003, message: "Transaction not found" } });
  if (payment.status === 'paid') return res.json({ id, error: { code: -31007, message: "Cannot cancel paid transaction" } });
  await supabase.from('payments').update({ status: 'cancelled', updated_at: new Date().toISOString(), cancel_reason: reason }).eq('id', payment.id);
  return res.json({ id, result: { cancel_time: Date.now(), transaction: payment.id.toString(), state: -1 } });
}

async function handleCheckTransaction(params: any, id: any, res: any) {
  const { id: paymeId } = params;
  const supabase = getSupabase();
  const { data: payment } = await supabase.from('payments').select('*').eq('payme_transaction_id', paymeId).maybeSingle();
  if (!payment) return res.json({ id, error: { code: -31003, message: "Transaction not found" } });
  return res.json({ id, result: { create_time: Number(payment.payme_time || 0), perform_time: payment.status === 'paid' ? new Date(payment.updated_at).getTime() : 0, cancel_time: payment.status === 'cancelled' ? new Date(payment.updated_at).getTime() : 0, transaction: payment.id.toString(), state: payment.status === 'paid' ? 2 : payment.status === 'cancelled' ? -1 : 1, reason: payment.cancel_reason || null } });
}

async function handleGetStatement(params: any, id: any, res: any) {
  const { from, to } = params;
  const supabase = getSupabase();
  const { data: payments } = await supabase.from('payments').select('*').gte('payme_time', from).lte('payme_time', to);
  const transactions = (payments || []).map(p => ({ id: p.payme_transaction_id, time: Number(p.payme_time), amount: p.amount, account: { order_id: p.order_id }, create_time: Number(p.payme_time), perform_time: p.status === 'paid' ? new Date(p.updated_at).getTime() : 0, cancel_time: p.status === 'cancelled' ? new Date(p.updated_at).getTime() : 0, transaction: p.id.toString(), state: p.status === 'paid' ? 2 : p.status === 'cancelled' ? -1 : 1, reason: p.cancel_reason || null }));
  return res.json({ id, result: { transactions } });
}

export default app;
