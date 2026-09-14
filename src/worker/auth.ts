import "dotenv/config";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { drizzle } from "drizzle-orm/d1";
import { organization } from "better-auth/plugins";
import type { Env } from "./index";

export function createAuthHandler(env: Env) {
  const db = drizzle(env.prod_sistema_doacoes_2);

  const auth = betterAuth({
    database: drizzleAdapter(db, {
      provider: "sqlite",
    }),
    plugins: [organization()],
    emailAndPassword: {
      enabled: true,
    },
    basePath: "/api/auth",
  });

  return auth.handler;
}