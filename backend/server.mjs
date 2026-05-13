import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { testConnection } from "./db.mjs";
import { requireAuth } from "./middleware/auth.mjs";

// Routes
import authRoutes from "./routes/auth.mjs";
import profileRoutes from "./routes/profile.mjs";
import pointagesRoutes from "./routes/pointages.mjs";
import absencesRoutes from "./routes/absences.mjs";
import justificatifsRoutes from "./routes/justificatifs.mjs";
import employeesRoutes from "./routes/employees.mjs";
import badgesRoutes from "./routes/badges.mjs";
import servicesRoutes from "./routes/services.mjs";
import joursFeriesRoutes from "./routes/jours-feries.mjs";
import notificationsRoutes from "./routes/notifications.mjs";
import sanctionsRoutes from "./routes/sanctions.mjs";
import statsRoutes from "./routes/stats.mjs";
import exportsRoutes from "./routes/exports.mjs";
import superadminRoutes from "./routes/superadmin.mjs";
import { initCronJobs } from "./jobs/cron.mjs";

const app = express();
const PORT = Number(process.env.PORT || 3001);

// ══════════════════════════════════════════
// MIDDLEWARE GLOBAUX
// ══════════════════════════════════════════

// CORS — restreint aux origines autorisées
const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:3000,http://localhost:5173,http://localhost:8080,http://10.0.2.2:3001").split(",");
app.use(cors({
  origin: (origin, callback) => {
    const isLocalhost = origin && (
      origin.startsWith("http://localhost:") || 
      origin.startsWith("http://127.0.0.1:") ||
      origin === "http://localhost" ||
      origin === "http://127.0.0.1"
    );

    if (!origin || allowedOrigins.includes(origin) || isLocalhost) {
      callback(null, true);
    } else if (process.env.NODE_ENV === "production") {
      callback(new Error(`Origine non autorisée: ${origin}`));
    } else {
      callback(null, true);
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: "10mb" }));

// Rate limiting sur l'auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 tentatives
  message: { message: "Trop de tentatives de connexion. Réessayez dans 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// ══════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ 
    ok: true, 
    service: "ontime-api", 
    version: "1.0.1",
    deployedAt: new Date().toISOString()
  });
});

// Auth (avec rate limit)
app.use("/api/auth", authLimiter, authRoutes);

// Routes protégées par JWT
app.use("/api/profile", requireAuth, profileRoutes);
app.use("/api/pointages", requireAuth, pointagesRoutes);
app.use("/api/absences", requireAuth, absencesRoutes);
app.use("/api/justificatifs", requireAuth, justificatifsRoutes);
app.use("/api/employees", requireAuth, employeesRoutes);
app.use("/api/badges", requireAuth, badgesRoutes);
app.use("/api/services", requireAuth, servicesRoutes);
app.use("/api/jours-feries", requireAuth, joursFeriesRoutes);
app.use("/api/notifications", requireAuth, notificationsRoutes);
app.use("/api/sanctions", requireAuth, sanctionsRoutes);
app.use("/api/stats", requireAuth, statsRoutes);
app.use("/api/exports", requireAuth, exportsRoutes);

// Routes SuperAdmin (accès restreint au SuperAdmin uniquement)
app.use("/api/admin", requireAuth, superadminRoutes);

// Types d'absence (accessible depuis exports.mjs mais aussi directement)
app.get("/api/types-absence", requireAuth, async (req, res, next) => {
  try {
    const { query: dbQuery } = await import("./db.mjs");
    const result = await dbQuery("SELECT * FROM types_absence WHERE actif = true ORDER BY libelle");
    res.json(result.rows.map((t) => ({
      id: t.id, code: t.code, libelle: t.libelle, justificatifRequis: t.justificatif_requis,
    })));
  } catch (err) {
    next(err);
  }
});

// ══════════════════════════════════════════
// GESTION D'ERREURS GLOBALE
// ══════════════════════════════════════════

// Multer error handler
app.use((err, req, res, next) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ message: "Fichier trop volumineux (max 5 Mo)." });
  }
  if (err.message && err.message.includes("Type de fichier")) {
    return res.status(400).json({ message: err.message });
  }
  next(err);
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error("❌ Erreur serveur:", err.message);
  if (process.env.NODE_ENV !== "production") {
    console.error(err.stack);
  }
  res.status(500).json({
    message: "Erreur interne du serveur.",
    ...(process.env.NODE_ENV !== "production" && { detail: err.message }),
  });
});

// 404
app.use((_req, res) => {
  res.status(404).json({ message: "Route non trouvée." });
});

// ══════════════════════════════════════════
// DÉMARRAGE
// ══════════════════════════════════════════

async function bootstrap() {
  try {
    await testConnection();
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 API OnTime lancée sur http://localhost:${PORT}`);
      console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
    });
    
    // Initialiser les jobs planifiés
    initCronJobs();
  } catch (err) {
    console.error("❌ Impossible de démarrer le serveur:", err.message);
    process.exit(1);
  }
}

bootstrap();
