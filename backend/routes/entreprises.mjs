import { Router } from "express";
import bcrypt from "bcrypt";
import { query } from "../db.mjs";
import pool from "../db.mjs";
import {
  authPayloadFromRow,
  AUTH_USER_JOINS,
  AUTH_USER_SELECT,
} from "../utils/authUser.mjs";

const router = Router();
export const plansRouter = Router();

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function slugify(nom) {
  return String(nom)
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ─── GET /api/plans ───
plansRouter.get("/", async (_req, res, next) => {
  try {
    const result = await query(
      `SELECT id, nom, slug, prix, max_employes, fonctionnalites
       FROM plans WHERE is_active = true ORDER BY prix ASC`
    );
    res.json(
      result.rows.map((p) => ({
        id: p.id,
        nom: p.nom,
        slug: p.slug,
        prix: Number(p.prix),
        maxEmployes: p.max_employes,
        fonctionnalites: p.fonctionnalites,
      }))
    );
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/entreprises/register ───
router.post("/register", async (req, res, next) => {
  const client = await pool.connect();

  try {
    const { nom, email, password, plan_id } = req.body || {};

    if (!nom || !email || !password || !plan_id) {
      return res.status(400).json({ message: "Tous les champs sont requis." });
    }

    const nomTrim = String(nom).trim();
    const emailLower = String(email).trim().toLowerCase();

    if (nomTrim.length < 2) {
      return res.status(400).json({
        message: "Le nom de l'entreprise doit contenir au moins 2 caractères.",
      });
    }

    if (!EMAIL_REGEX.test(emailLower)) {
      return res.status(400).json({ message: "Format d'email invalide." });
    }

    if (!PASSWORD_REGEX.test(password)) {
      return res.status(400).json({
        message:
          "Le mot de passe doit contenir au moins 8 caractères, une majuscule, un chiffre et un symbole.",
      });
    }

    const planResult = await query(
      "SELECT id, nom FROM plans WHERE id = $1 AND is_active = true",
      [plan_id]
    );
    if (!planResult.rowCount) {
      return res.status(400).json({ message: "Le plan sélectionné n'existe pas." });
    }

    const emailEntreprise = await query(
      "SELECT id FROM entreprises WHERE LOWER(email) = $1",
      [emailLower]
    );
    const emailEmploye = await query(
      "SELECT id FROM employes WHERE LOWER(email) = $1",
      [emailLower]
    );

    if (emailEntreprise.rowCount > 0 || emailEmploye.rowCount > 0) {
      return res.status(409).json({
        message:
          "Cet email est déjà utilisé. Veuillez choisir un autre email.",
        code: "EMAIL_EXISTS",
      });
    }

    let slug = slugify(nomTrim);
    const slugCheck = await query("SELECT id FROM entreprises WHERE slug = $1", [slug]);
    if (slugCheck.rowCount > 0) {
      slug = `${slug}-${Date.now()}`;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await client.query("BEGIN");

    const entrepriseResult = await client.query(
      `INSERT INTO entreprises (nom, slug, email, password_hash, plan_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, nom, slug, email, plan_id, subscription_status, trial_ends_at, created_at`,
      [nomTrim, slug, emailLower, passwordHash, plan_id]
    );
    const entreprise = entrepriseResult.rows[0];

    let serviceResult = await client.query(
      `SELECT id FROM services WHERE nom = 'Ressources Humaines' AND actif = true LIMIT 1`
    );
    if (!serviceResult.rowCount) {
      serviceResult = await client.query(
        `SELECT id FROM services WHERE actif = true ORDER BY created_at ASC LIMIT 1`
      );
    }
    if (!serviceResult.rowCount) {
      serviceResult = await client.query(
        `INSERT INTO services (nom, description) VALUES ('Direction', 'Service principal de l''entreprise')
         ON CONFLICT (nom) DO UPDATE SET nom = EXCLUDED.nom
         RETURNING id`
      );
    }

        const matricule = 'EMP-' + Date.now();

    const adminResult = await client.query(
      `INSERT INTO employes (
         matricule, first_name, last_name, email, password_hash,
         role, service_id, poste, type_contrat, date_embauche,
         first_login, entreprise_id, actif
       ) VALUES ($1, $2, $3, $4, $5, 'admin', $6, $7, 'CDI', CURRENT_DATE, true, $8, true)
       RETURNING id, matricule, email`,
      [
        matricule,
        "Admin",
        nomTrim.slice(0, 100),
        emailLower,
        passwordHash,
        serviceResult.rows[0].id,
        "Administrateur",
        entreprise.id,
      ]
    );

    await client.query("COMMIT");

    const userResult = await query(
      `SELECT ${AUTH_USER_SELECT} ${AUTH_USER_JOINS} WHERE e.id = $1`,
      [adminResult.rows[0].id]
    );
    const authData = authPayloadFromRow(userResult.rows[0]);

    console.log(`✅ Entreprise inscrite : ${entreprise.nom} (${entreprise.email})`);

    res.status(201).json({
      message: "Entreprise créée avec succès !",
      ...authData,
      entreprise: {
        id: entreprise.id,
        nom: entreprise.nom,
        slug: entreprise.slug,
        email: entreprise.email,
        planId: entreprise.plan_id,
        planNom: planResult.rows[0].nom,
        subscriptionStatus: entreprise.subscription_status,
        trialEndsAt: entreprise.trial_ends_at,
        createdAt: entreprise.created_at,
      },
    });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    if (err.code === "23505") {
      return res.status(409).json({
        message:
          "Cet email est déjà utilisé. Veuillez choisir un autre email.",
        code: "EMAIL_EXISTS",
      });
    }
    next(err);
  } finally {
    client.release();
  }
});

export default router;
