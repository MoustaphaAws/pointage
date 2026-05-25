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

// ─── Middlewares de permissions granulaires pour les admins ───
// Les superadmins passent toujours. Les admins sont vérifiés via admin_permissions en BDD.

async function checkAdminPermission(req, res, permissionKey) {
  // Superadmin → toujours autorisé
  if (req.auth.role === "superadmin") return true;

  // Seul un admin peut avoir des permissions
  if (req.auth.role !== "admin") {
    res.status(403).json({ message: "Accès réservé aux administrateurs." });
    return false;
  }

  // Charger les permissions depuis la BDD
  const { query } = await import("../db.mjs");
  const result = await query("SELECT admin_permissions FROM employes WHERE id = $1", [req.auth.sub]);
  if (!result.rowCount) {
    res.status(403).json({ message: "Utilisateur introuvable." });
    return false;
  }

  const rawPerms = result.rows[0].admin_permissions;
  // Si admin_permissions est NULL ou objet vide, toutes les permissions sont accordées par défaut
  const permissions = rawPerms && typeof rawPerms === 'object' && Object.keys(rawPerms).length > 0
    ? rawPerms
    : { canPoint: true, canApplySanctions: true, canValidateAbsences: true, canManageEmployees: true };
  if (permissions[permissionKey] === false) {
    res.status(403).json({ message: "Vous n'avez pas la permission pour cette action." });
    return false;
  }
  return true;
}

export function requireCanPoint(req, res, next) {
  checkAdminPermission(req, res, "canPoint").then((ok) => ok && next()).catch(() =>
    res.status(500).json({ message: "Erreur de vérification des permissions." })
  );
}

export function requireCanApplySanctions(req, res, next) {
  checkAdminPermission(req, res, "canApplySanctions").then((ok) => ok && next()).catch(() =>
    res.status(500).json({ message: "Erreur de vérification des permissions." })
  );
}

export function requireCanValidateAbsences(req, res, next) {
  checkAdminPermission(req, res, "canValidateAbsences").then((ok) => ok && next()).catch(() =>
    res.status(500).json({ message: "Erreur de vérification des permissions." })
  );
}

export function requireCanManageEmployees(req, res, next) {
  checkAdminPermission(req, res, "canManageEmployees").then((ok) => ok && next()).catch(() =>
    res.status(500).json({ message: "Erreur de vérification des permissions." })
  );
}
