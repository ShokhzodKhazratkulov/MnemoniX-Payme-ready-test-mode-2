import express from "express";
import path from "path";
import app from "./src/api";

const PORT = 3000;

// --- Vite and SPA Fallback ---

async function startServer() {
  const isVercel = process.env.VERCEL === '1';
  if (isVercel) {
    console.log("On Vercel - server module loaded");
    return;
  }

  try {
    if (process.env.NODE_ENV !== "production") {
      console.log("Starting in DEVELOPMENT mode");
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      console.log("Starting in PRODUCTION mode");
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      
      app.all("*", (req, res) => {
        // API routes are already handled by src/api.ts which is 'app'
        // This catch-all is for the frontend
        if (req.path.startsWith('/api/')) {
          return res.status(404).json({ error: "API route not found" });
        }
        if (req.method === 'GET') {
          return res.sendFile(path.join(distPath, "index.html"));
        }
        res.status(404).send("Not Found");
      });
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
  }
}

startServer();
