import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || "4h";

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    JWT_SECRET,
    { expiresIn: EXPIRES_IN }
  );
}

export function requireAuth(req, res, next) {
  const authorization = req.headers.authorization || "";
  if (!authorization.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token manquant." });
  }

  const token = authorization.replace("Bearer ", "");
  try {
    req.auth = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: "Token invalide ou expiré." });
  }
}

export function requireSuperAdmin(req, res, next) {
  if (!req.auth || req.auth.role !== "superadmin") {
    return res.status(403).json({ message: "Accès réservé au SuperAdmin." });
  }
  next();
}
