import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "8h";
const JWT_SUPERADMIN_EXPIRES_IN = process.env.JWT_SUPERADMIN_EXPIRES_IN || "4h";

// Vérification sécurité : refuser le secret par défaut en production
if (process.env.NODE_ENV === "production" && JWT_SECRET === "dev-secret-change-me") {
  console.error("❌ FATAL: JWT_SECRET doit être défini en production !");
  process.exit(1);
}

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email, serviceId: user.service_id },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// Token avec durée adaptée au rôle (4h pour SuperAdmin, 8h pour les autres)
export function signTokenForRole(user) {
  const expiresIn = user.role === "superadmin" ? JWT_SUPERADMIN_EXPIRES_IN : JWT_EXPIRES_IN;
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email, serviceId: user.service_id },
    JWT_SECRET,
    { expiresIn }
  );
}

// Middleware: vérifie le JWT et attache req.auth
export function requireAuth(req, res, next) {
  const authorization = req.headers.authorization || "";
  if (!authorization.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token manquant." });
  }
  try {
    req.auth = jwt.verify(authorization.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: "Token invalide ou expiré." });
  }
}

// Middleware: accès admin ou superadmin uniquement
export function requireAdmin(req, res, next) {
  if (!req.auth || (req.auth.role !== "admin" && req.auth.role !== "superadmin")) {
    return res.status(403).json({ message: "Accès réservé aux administrateurs." });
  }
  next();
}

// Middleware: accès superadmin uniquement
export function requireSuperAdmin(req, res, next) {
  if (!req.auth || req.auth.role !== "superadmin") {
    return res.status(403).json({ message: "Accès réservé au SuperAdmin." });
  }
  next();
}
