import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import Discord from "next-auth/providers/discord";
import Nodemailer from "next-auth/providers/nodemailer";
import Resend from "next-auth/providers/resend";
import { mariaAuthAdapter } from "@/lib/auth/mariaAuthAdapter";
import { isMariaDbConfigured } from "@/lib/db/mariadb";

const adapter = isMariaDbConfigured() ? mariaAuthAdapter() : undefined;

const emailFrom =
  process.env.AUTH_EMAIL_FROM?.trim() ||
  process.env.EMAIL_FROM?.trim() ||
  "NexusWorld <onboarding@resend.dev>";

function buildProviders(): NextAuthConfig["providers"] {
  const list: NextAuthConfig["providers"] = [];

  const discordId = process.env.AUTH_DISCORD_ID?.trim();
  const discordSecret = process.env.AUTH_DISCORD_SECRET?.trim();
  if (discordId && discordSecret) {
    list.push(
      Discord({
        clientId: discordId,
        clientSecret: discordSecret,
      })
    );
  }

  if (adapter) {
    const resendKey =
      process.env.AUTH_RESEND_KEY?.trim() ||
      process.env.RESEND_API_KEY?.trim();
    if (resendKey) {
      list.push(
        Resend({
          apiKey: resendKey,
          from: emailFrom,
        })
      );
    } else if (process.env.EMAIL_SERVER?.trim()) {
      list.push(
        Nodemailer({
          server: process.env.EMAIL_SERVER,
          from: emailFrom,
        })
      );
    }
  } else if (
    process.env.AUTH_RESEND_KEY?.trim() ||
    process.env.RESEND_API_KEY?.trim() ||
    process.env.EMAIL_SERVER?.trim()
  ) {
    console.warn(
      "[auth] Email magic link needs MariaDB + npm run db:migrate (auth_* tables). Discord OAuth works without DB (JWT only)."
    );
  }

  if (list.length === 0) {
    console.warn(
      "[auth] No providers enabled. Set AUTH_DISCORD_ID + AUTH_DISCORD_SECRET, or configure DB + AUTH_RESEND_KEY (or EMAIL_SERVER)."
    );
  }

  return list;
}

export const authConfig = {
  trustHost: true,
  adapter,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  providers: buildProviders(),
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.name = user.name;
        token.email = user.email;
        token.picture = user.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        if (token.name) session.user.name = token.name as string;
        if (token.email) session.user.email = token.email as string;
        if (token.picture) session.user.image = token.picture as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
