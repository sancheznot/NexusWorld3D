/**
 * ES: Qué métodos de login están activos (solo flags, sin secretos).
 * EN: Which sign-in methods are enabled (flags only, no secrets).
 */

import { isMariaDbConfigured } from "@/lib/db/mariadb";

export type PublicAuthFlags = {
  discord: boolean;
  email: boolean;
  /** ES: `resend` | `nodemailer` si email está activo. EN: Provider id for signIn(). */
  emailProvider: "resend" | "nodemailer" | null;
};

export function getPublicAuthFlags(): PublicAuthFlags {
  const discord = Boolean(
    process.env.AUTH_DISCORD_ID?.trim() &&
      process.env.AUTH_DISCORD_SECRET?.trim()
  );
  const db = isMariaDbConfigured();
  const resend = Boolean(
    db &&
      (process.env.AUTH_RESEND_KEY?.trim() ||
        process.env.RESEND_API_KEY?.trim())
  );
  const nodemailer = Boolean(db && process.env.EMAIL_SERVER?.trim());
  const email = resend || nodemailer;
  return {
    discord,
    email,
    emailProvider: resend ? "resend" : nodemailer ? "nodemailer" : null,
  };
}
