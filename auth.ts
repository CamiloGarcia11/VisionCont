import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { getSql, logActivity } from "@/lib/db";
import { verifyPassword } from "@/lib/password";

const credentialsSchema = z.object({
  email: z.string().trim().email("Correo electrónico inválido"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Usuario y contraseña",
      credentials: {
        email: { label: "Correo electrónico", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) {
          return null;
        }

        const { email, password } = parsed.data;
        const sql = getSql();

        const rows = (await sql`
          SELECT id, email, name, image, password_hash
          FROM users
          WHERE LOWER(email) = LOWER(${email})
          LIMIT 1
        `) as {
          id: string;
          email: string;
          name: string | null;
          image: string | null;
          password_hash: string | null;
        }[];

        const user = rows[0];
        if (!user || !user.password_hash) {
          return null;
        }

        const isValid = verifyPassword(password, user.password_hash);
        if (!isValid) {
          return null;
        }

        await logActivity({
          userId: user.id,
          action: "auth_login",
          targetType: "user",
          targetId: user.id,
          summary: `Inicio de sesión (${user.email})`,
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.userId = user.id;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user && typeof token.userId === "string") {
        session.user.id = token.userId;
      }
      return session;
    },
  },
});
