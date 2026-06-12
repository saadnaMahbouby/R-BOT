import { ORPCError } from "@orpc/server";
import { publicProcedure } from "@typebot.io/config/orpc/builder/middlewares";
import prisma from "@typebot.io/prisma";
import { z } from "@typebot.io/zod";
import { verifyPassword } from "../helpers/password";
import {
  encryptTotpSecret,
  generateQrCodeDataUrl,
  generateTotpSecret,
  getOtpauthUrl,
} from "../helpers/totp";

export const prepareLogin = publicProcedure
  .input(
    z.object({
      email: z.string().email(),
      password: z.string(),
    }),
  )
  .handler(async ({ input }) => {
    const email = input.email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, password: true, totpEnabled: true },
    });
    if (!user?.password) throw invalidCredentialsError();

    const isPasswordValid = await verifyPassword(input.password, user.password);
    if (!isPasswordValid) throw invalidCredentialsError();

    if (user.totpEnabled) return { step: "totp" as const };

    const secret = generateTotpSecret();
    await prisma.user.update({
      where: { id: user.id },
      data: { totpSecret: await encryptTotpSecret(secret) },
    });
    const qrCodeDataUrl = await generateQrCodeDataUrl(
      getOtpauthUrl(email, secret),
    );
    return { step: "enroll" as const, qrCodeDataUrl, secret };
  });

const invalidCredentialsError = () =>
  new ORPCError("UNAUTHORIZED", { message: "Invalid email or password" });
