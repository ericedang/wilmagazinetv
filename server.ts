import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  
  // Set Content Security Policy headers
  app.use((req, res, next) => {
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self' https: wss: data: blob: 'unsafe-inline' 'unsafe-eval'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https: blob:; style-src 'self' 'unsafe-inline' https:; font-src 'self' data: https:; img-src 'self' data: blob: https: http:; connect-src 'self' https: wss:; frame-src 'self' https:;"
    );
    next();
  });

  // Expose configuration securely
  app.get('/api/config', (req, res) => {
    res.json({ geminiApiKey: process.env.GEMINI_API_KEY });
  });

  // --- MMGate Mobile Money Gateway Integration ---

  // 1. Initialiser un paiement: PAIEMENTP
  app.post("/api/mmgate/payment", async (req, res) => {
    const { phoneNumber, amount, reference } = req.body;
    
    const mmgateUrl = process.env.MMGATE_URL;
    const cdprt = process.env.MMGATE_PARTNER_CODE;
    const usr = process.env.MMGATE_USER;
    const pwd = process.env.MMGATE_PASSWORD;
    const token = process.env.MMGATE_PARTNER_TOKEN;

    if (!mmgateUrl || !token || !cdprt || !usr || !pwd) {
      console.error("MMGate Configuration missing.");
      return res.status(500).json({ error: "Passerelle de paiement non configurée." });
    }

    try {
      // Nettoyer le numéro (format international sans + ou espace, ex 23769...)
      const expo = phoneNumber?.replace(/[^0-9]/g, '');
      if (!expo) {
        return res.status(400).json({ error: "Numéro de téléphone invalide ou manquant." });
      }

      const monto = Math.round(Number(amount));
      if (!monto || isNaN(monto) || monto <= 0) {
         return res.status(400).json({ error: "Montant nul ou invalide." });
      }

      // Construction de l'URL (avec slash final géré)
      const baseUrl = mmgateUrl.endsWith('/') ? mmgateUrl.slice(0, -1) : mmgateUrl;
      const paymentUrl = `${baseUrl}/PAIEMENTP/${expo}/${monto}/${cdprt}/${usr}/${pwd}`;

      console.log(`Initialisation paiement MMGate: ${paymentUrl}`);

      const response = await fetch(paymentUrl, {
        method: "GET",
        headers: {
          "token": token,
          "Token": token,
          "X-Partner-Token": token,
          "Authorization": `Bearer ${token}`
        }
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error("Invalid JSON from MMGate:", responseText);
        return res.status(502).json({ error: "Réponse invalide de l'opérateur (MMGate)", details: responseText });
      }

      console.log("MMGate PAIEMENTP Response:", data);
      res.json(data);
    } catch (error: any) {
      console.error("MMGate Payment Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // 1.b. Confirmer un doublon (X-MMGate-Confirm-Duplicate)
  app.post("/api/mmgate/payment/confirm-duplicate", async (req, res) => {
    const { phoneNumber, amount, reference } = req.body;
    
    const mmgateUrl = process.env.MMGATE_URL;
    const cdprt = process.env.MMGATE_PARTNER_CODE;
    const usr = process.env.MMGATE_USER;
    const pwd = process.env.MMGATE_PASSWORD;
    const token = process.env.MMGATE_PARTNER_TOKEN;

    try {
      const expo = phoneNumber?.replace(/[^0-9]/g, '');
      const monto = Math.round(Number(amount));
      
      if (!expo || !monto || isNaN(monto) || monto <= 0) {
        return res.status(400).json({ error: "Paramètres invalides pour la confirmation." });
      }

      const baseUrl = mmgateUrl?.endsWith('/') ? mmgateUrl.slice(0, -1) : mmgateUrl;
      const paymentUrl = `${baseUrl}/PAIEMENTP/${expo}/${monto}/${cdprt}/${usr}/${pwd}`;

      const response = await fetch(paymentUrl, {
        method: "GET",
        headers: {
          "token": token || '',
          "Token": token || '',
          "X-Partner-Token": token || '',
          "Authorization": `Bearer ${token}`,
          "X-MMGate-Confirm-Duplicate": "1"
        }
      });

      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 2. Vérifier le statut: ETATO
  app.get("/api/mmgate/status/:idoper", async (req, res) => {
    const { idoper } = req.params;

    const mmgateUrl = process.env.MMGATE_URL;
    const cdprt = process.env.MMGATE_PARTNER_CODE;
    const usr = process.env.MMGATE_USER;
    const pwd = process.env.MMGATE_PASSWORD;
    const token = process.env.MMGATE_PARTNER_TOKEN;

    if (!mmgateUrl || !cdprt || !usr || !pwd) {
      return res.status(500).json({ error: "Passerelle de paiement non configurée." });
    }

    try {
      const baseUrl = mmgateUrl.endsWith('/') ? mmgateUrl.slice(0, -1) : mmgateUrl;
      const statusUrl = `${baseUrl}/ETATO/${idoper}/${cdprt}/${usr}/${pwd}`;

      const response = await fetch(statusUrl, {
        method: "GET",
        headers: {
          "token": token || '',
          "Token": token || '',
          "X-Partner-Token": token || '',
          "Authorization": `Bearer ${token}`
        }
      });

      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("MMGate Status Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // --- Fin MMGate ---

  // Stripe Checkout Session Endpoint
  app.post("/api/create-checkout-session", async (req, res) => {
    if (!stripe) {
      return res.status(500).json({ error: "Stripe is not configured" });
    }

    const { priceId, userId, email } = req.body;

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: `${req.headers.origin}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.origin}/subscribe`,
        customer_email: email,
        metadata: {
          userId: userId,
        },
      });

      res.json({ id: session.id });
    } catch (error: any) {
      console.error("Stripe Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Flutterwave Verification Endpoint
  app.post("/api/verify-payment", async (req, res) => {
    const { transaction_id } = req.body;
    const secretKey = process.env.FLW_SECRET_KEY;

    if (!secretKey) {
      console.error("CRITICAL: FLW_SECRET_KEY is not set in environment variables.");
      return res.status(500).json({ 
        error: "Le serveur de paiement n'est pas configuré (FLW_SECRET_KEY manquant).",
        status: "error"
      });
    }

    try {
      console.log(`Verifying Flutterwave transaction: ${transaction_id}`);
      const response = await fetch(`https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${secretKey}`
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error("Flutterwave API Error:", data);
        return res.status(response.status).json(data);
      }

      console.log("Flutterwave Verification Success:", data.status);
      res.json(data);
    } catch (error: any) {
      console.error("Flutterwave Verification Exception:", error);
      res.status(500).json({ error: error.message, status: "error" });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
