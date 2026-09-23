import "dotenv/config";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { drizzle } from "drizzle-orm/d1";
import { organization } from "better-auth/plugins";
import { env } from "cloudflare:workers";
import * as schema from "./db/auth-schema";

const db = drizzle(env.prod_sistema_doacoes_2);

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema,
  }),
  plugins: [organization()],
  emailAndPassword: {
    enabled: true,
  },
  basePath: "/api/auth",
  trustedOrigins: ["http://localhost:5173", "https://sd2.tosk.dev"],
});