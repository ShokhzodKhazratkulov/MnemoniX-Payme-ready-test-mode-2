
import express, { Request, Response, NextFunction } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
const PORT = 3000;

// Initialize Supabase Admin client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ""
);

// Enable CORS for all routes (important for cross-origin Payme test tools)
app.use(cors());

// Use Express built-in body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Logger Middleware for debugging API calls
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/api')) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    if (req.method === 'POST') {
      console.log('Body:', JSON.stringify(req.body, null, 2));
    }
  }
  next();
});

// Payme Merchant API Handler
// Supporting both /api/payme and /api/payme/
const paymeHandler = async (req: Request, res: Response) => {
  // If it's a GET request, return a simple status (useful for verification)
  if (req.method === 'GET') {
    return res.json({ status: "Payme API is active", path: req.path });
  }

  const { method, params, id } = req.body;
  const authHeader = req.headers.authorization;

  console.log(`Payme Method: ${method}, Request ID: ${id}`);

  // Basic Auth Check
  // Payme sends: Authorization: Basic Base64(Paycom:SECRET_KEY)
  const paymeKey = process.env.PAYME_KEY;
  if (!paymeKey) {
    console.error("CRITICAL: PAYME_KEY is not defined in environment variables");
    return res.json({ id, error: { code: -32504, message: "Server configuration error (missing key)" } });
  }

  const expectedAuth = `Basic ${Buffer.from(`Paycom:${paymeKey}`).toString('base64')}`;
  
  if (!authHeader || authHeader !== expectedAuth) {
    console.warn(`Unauthorized Payme request: expected ${expectedAuth}, got ${authHeader}`);
    return res.json({ id, error: { code: -32504, message: "Error auth" } });
  }

  // Payme Protocol Implementation
  try {
    switch (method) {
      case "CheckPerformTransaction":
        return await handleCheckPerform(params, id, res);
      case "CreateTransaction":
        return await handleCreateTransaction(params, id, res);
      case "PerformTransaction":
        return await handlePerformTransaction(params, id, res);
      case "CancelTransaction":
        return await handleCancelTransaction(params, id, res);
      case "CheckTransaction":
        return await handleCheckTransaction(params, id, res);
      case "GetStatement":
        return await handleGetStatement(params, id, res);
      default:
        console.warn(`Unknown Payme method requested: ${method}`);
        return res.json({ id, error: { code: -32601, message: "Method not found" } });
    }
  } catch (err) {
    console.error("Payme API Processing Error:", err);
    return res.json({ id, error: { code: -31008, message: "Internal Server Error" } });
  }
};

app.all("/api/payme", paymeHandler);
app.all("/api/payme/", paymeHandler);

// --- Payme Method Handlers ---

async function handleCheckPerform(params: any, id: any, res: any) {
  const { amount, account } = params;
  const orderId = account.order_id;

  if (!orderId) {
    return res.json({ id, error: { code: -31050, message: "Order ID missing" } });
  }

  // Check if payment already exists in database
  const { data: payment, error } = await supabase
    .from('payments')
    .select('*')
    .eq('order_id', orderId)
    .maybeSingle();

  if (error) {
    console.error("Supabase error finding order:", error);
    return res.json({ id, error: { code: -31050, message: "Database error" } });
  }

  if (!payment) {
    console.warn(`Order not found for CheckPerformTransaction: ${orderId}`);
    return res.json({ id, error: { code: -31050, message: "Order not found" } });
  }

  // Payme amounts are in Tiyin (1 UZS = 100 Tiyin)
  if (Number(payment.amount) !== Number(amount)) {
    return res.json({ id, error: { code: -31050, message: "Incorrect amount" } });
  }

  return res.json({
    id,
    result: {
      allow: true,
      detail: {
        order_id: orderId,
        description: `MnemoniX Premium: ${payment.package_type}`
      }
    }
  });
}

async function handleCreateTransaction(params: any, id: any, res: any) {
  const { id: paymeId, time, amount, account } = params;
  const orderId = account.order_id;

  const { data: payment } = await supabase.from('payments').select('*').eq('order_id', orderId).maybeSingle();

  if (!payment) {
    return res.json({ id, error: { code: -31050, message: "Order not found" } });
  }

  // If transaction already exists but has different ID
  if (payment.payme_transaction_id && payment.payme_transaction_id !== paymeId) {
    return res.json({ id, error: { code: -31099, message: "Transaction already exists" } });
  }

  // Update payment with payme transaction ID and state
  const { error: updateError } = await supabase.from('payments').update({
    payme_transaction_id: paymeId,
    status: 'pending',
    payme_time: time
  }).eq('order_id', orderId);

  if (updateError) throw updateError;

  return res.json({
    id,
    result: {
      create_time: Number(time),
      transaction: payment.id.toString(),
      state: 1
    }
  });
}

async function handlePerformTransaction(params: any, id: any, res: any) {
  const { id: paymeId } = params;

  const { data: payment } = await supabase.from('payments').select('*').eq('payme_transaction_id', paymeId).maybeSingle();

  if (!payment) {
    return res.json({ id, error: { code: -31003, message: "Transaction not found" } });
  }

  if (payment.status === 'paid') {
    return res.json({
      id,
      result: {
        perform_time: new Date(payment.updated_at).getTime(),
        transaction: payment.id.toString(),
        state: 2
      }
    });
  }

  // FULFILLMENT: Calculate subscription expansion
  const months = payment.package_type === '1_month' ? 1 : payment.package_type === '3_months' ? 3 : 6;
  
  // Get current profile to check if they already have premium to extend it
  const { data: profile } = await supabase.from('profiles').select('subscription_expires_at').eq('id', payment.user_id).single();
  
  let newExpiryDate = new Date();
  if (profile?.subscription_expires_at && new Date(profile.subscription_expires_at) > new Date()) {
    newExpiryDate = new Date(profile.subscription_expires_at);
  }
  newExpiryDate.setMonth(newExpiryDate.getMonth() + months);

  // Update Profile - atomic operation would be better but this is fine for now
  await supabase.from('profiles').update({
    subscription_tier: 'PREMIUM',
    subscription_expires_at: newExpiryDate.toISOString()
  }).eq('id', payment.user_id);

  // Update Payment Status
  const now = Date.now();
  await supabase.from('payments').update({
    status: 'paid',
    updated_at: new Date(now).toISOString()
  }).eq('id', payment.id);

  return res.json({
    id,
    result: {
      perform_time: now,
      transaction: payment.id.toString(),
      state: 2
    }
  });
}

async function handleCancelTransaction(params: any, id: any, res: any) {
  const { id: paymeId, reason } = params;

  const { data: payment } = await supabase.from('payments').select('*').eq('payme_transaction_id', paymeId).maybeSingle();

  if (!payment) {
    return res.json({ id, error: { code: -31003, message: "Transaction not found" } });
  }

  if (payment.status === 'paid') {
    return res.json({ id, error: { code: -31007, message: "Cannot cancel paid transaction" } });
  }

  await supabase.from('payments').update({
    status: 'cancelled',
    updated_at: new Date().toISOString(),
    cancel_reason: reason
  }).eq('id', payment.id);

  return res.json({
    id,
    result: {
      cancel_time: Date.now(),
      transaction: payment.id.toString(),
      state: -1
    }
  });
}

async function handleCheckTransaction(params: any, id: any, res: any) {
  const { id: paymeId } = params;

  const { data: payment } = await supabase.from('payments').select('*').eq('payme_transaction_id', paymeId).maybeSingle();

  if (!payment) {
    return res.json({ id, error: { code: -31003, message: "Transaction not found" } });
  }

  return res.json({
    id,
    result: {
      create_time: Number(payment.payme_time || 0),
      perform_time: payment.status === 'paid' ? new Date(payment.updated_at).getTime() : 0,
      cancel_time: payment.status === 'cancelled' ? new Date(payment.updated_at).getTime() : 0,
      transaction: payment.id.toString(),
      state: payment.status === 'paid' ? 2 : payment.status === 'cancelled' ? -1 : 1,
      reason: payment.cancel_reason || null
    }
  });
}

async function handleGetStatement(params: any, id: any, res: any) {
  const { from, to } = params;
  
  const { data: payments } = await supabase
    .from('payments')
    .select('*')
    .gte('payme_time', from)
    .lte('payme_time', to);

  const transactions = (payments || []).map(p => ({
    id: p.payme_transaction_id,
    time: Number(p.payme_time),
    amount: p.amount,
    account: { order_id: p.order_id },
    create_time: Number(p.payme_time),
    perform_time: p.status === 'paid' ? new Date(p.updated_at).getTime() : 0,
    cancel_time: p.status === 'cancelled' ? new Date(p.updated_at).getTime() : 0,
    transaction: p.id.toString(),
    state: p.status === 'paid' ? 2 : p.status === 'cancelled' ? -1 : 1,
    reason: p.cancel_reason || null
  }));

  return res.json({
    id,
    result: { transactions }
  });
}

// --- Vite and SPA Fallback ---

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    
    // Important: Handle *all* other requests
    app.all("*", (req: Request, res: Response) => {
      // Don't serve HTML for API paths that missed
      if (req.path.startsWith('/api/')) {
        console.warn(`API Route not found: ${req.method} ${req.path}`);
        return res.status(404).json({ 
          error: "API route not found",
          path: req.path,
          method: req.method
        });
      }
      
      // For all other GET requests, serve the SPA
      if (req.method === 'GET') {
        return res.sendFile(path.join(distPath, "index.html"));
      }
      
      // For other methods to non-API routes, return 404
      res.status(404).send("Not Found");
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
