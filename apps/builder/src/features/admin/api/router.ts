import { ORPCError } from "@orpc/server";
import { hashPassword } from "@typebot.io/auth/helpers/password";
import { adminProcedure } from "@typebot.io/config/orpc/builder/middlewares";
import prisma from "@typebot.io/prisma";
import {
  PrismaClientKnownRequestError,
  UserRole,
  WorkspaceRole,
} from "@typebot.io/prisma/enum";
import { parseWorkspaceDefaultPlan } from "@typebot.io/workspaces/parseWorkspaceDefaultPlan";
import { z } from "@typebot.io/zod";

const listUsers = adminProcedure.handler(async () => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      totpEnabled: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
  return { users };
});

const createUser = adminProcedure
  .input(
    z.object({
      email: z.string().email(),
      name: z.string().optional(),
      password: z.string().min(8),
      role: z.nativeEnum(UserRole).default(UserRole.ADMIN),
    }),
  )
  .handler(async ({ context, input }) => {
    const email = input.email.toLowerCase().trim();
    const rootMembership = await prisma.memberInWorkspace.findFirst({
      where: { userId: context.user.id, role: WorkspaceRole.ADMIN },
      orderBy: { workspace: { createdAt: "asc" } },
      select: { workspaceId: true },
    });
    const rootWorkspaceId = rootMembership?.workspaceId;
    try {
      const user = await prisma.user.create({
        data: {
          email,
          name: input.name,
          password: await hashPassword(input.password),
          role: input.role,
          onboardingCategories: [],
          workspaces: rootWorkspaceId
            ? {
                create: {
                  role: WorkspaceRole.MEMBER,
                  workspaceId: rootWorkspaceId,
                },
              }
            : {
                create: {
                  role: WorkspaceRole.ADMIN,
                  workspace: {
                    create: {
                      name: input.name
                        ? `${input.name}'s workspace`
                        : "My workspace",
                      plan: parseWorkspaceDefaultPlan(email),
                    },
                  },
                },
              },
        },
        select: { id: true, email: true },
      });
      return { user };
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
        throw new ORPCError("CONFLICT", {
          message: "A user with this email already exists",
        });
      throw error;
    }
  });

const resetPassword = adminProcedure
  .input(
    z.object({
      userId: z.string(),
      password: z.string().min(8),
      resetTotp: z.boolean().optional(),
    }),
  )
  .handler(async ({ input }) => {
    await prisma.user.update({
      where: { id: input.userId },
      data: {
        password: await hashPassword(input.password),
        ...(input.resetTotp ? { totpSecret: null, totpEnabled: false } : {}),
      },
    });
    return { success: true };
  });

const deleteUser = adminProcedure
  .input(z.object({ userId: z.string() }))
  .handler(async ({ context, input }) => {
    if (context.user.id === input.userId)
      throw new ORPCError("BAD_REQUEST", {
        message: "You cannot delete your own account",
      });
    await prisma.user.delete({ where: { id: input.userId } });
    return { success: true };
  });

export const adminRouter = {
  listUsers,
  createUser,
  resetPassword,
  deleteUser,
};
