import prisma from "@typebot.io/prisma";
import Credentials from "next-auth/providers/credentials";
import type { Provider } from "next-auth/providers/index";
import { verifyPassword } from "../helpers/password";
import { decryptTotpSecret, verifyTotpCode } from "../helpers/totp";

export const providers: Provider[] = [
  Credentials({
    id: "credentials",
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
      totpCode: { label: "Authenticator code", type: "text" },
    },
    authorize: async (credentials) => {
      const email = asString(credentials?.email)?.toLowerCase().trim();
      const password = asString(credentials?.password);
      const totpCode = asString(credentials?.totpCode);
      if (!email || !password || !totpCode) return null;

      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          password: true,
          totpSecret: true,
          totpEnabled: true,
        },
      });
      if (!user?.password || !user.totpSecret) return null;

      const isPasswordValid = await verifyPassword(password, user.password);
      if (!isPasswordValid) return null;

      const secret = await decryptTotpSecret(user.totpSecret);
      if (!verifyTotpCode(totpCode, secret)) return null;

      if (!user.totpEnabled)
        await prisma.user.update({
          where: { id: user.id },
          data: { totpEnabled: true },
        });

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      };
    },
  }),
];

const asString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;
