import * as p from "@clack/prompts";
import { hashPassword } from "@typebot.io/auth/helpers/password";
import prisma from "@typebot.io/prisma";
import { UserRole, WorkspaceRole } from "@typebot.io/prisma/enum";
import { parseWorkspaceDefaultPlan } from "@typebot.io/workspaces/parseWorkspaceDefaultPlan";

const main = async () => {
  p.intro("Création d'un administrateur");

  const email = await p.text({
    message: "Email de l'administrateur",
    validate: (value) =>
      /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value.trim())
        ? undefined
        : "Email invalide",
  });
  if (p.isCancel(email)) return p.cancel("Annulé.");

  const name = await p.text({
    message: "Nom (optionnel)",
    defaultValue: "",
    placeholder: "Jean Dupont",
  });
  if (p.isCancel(name)) return p.cancel("Annulé.");

  const password = await p.password({
    message: "Mot de passe (min. 8 caractères)",
    validate: (value) =>
      value.length >= 8 ? undefined : "Au moins 8 caractères",
  });
  if (p.isCancel(password)) return p.cancel("Annulé.");

  const normalizedEmail = email.trim().toLowerCase();
  const hashedPassword = await hashPassword(password);

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, workspaces: { select: { workspaceId: true } } },
  });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        password: hashedPassword,
        role: UserRole.ADMIN,
        totpSecret: null,
        totpEnabled: false,
        ...(existing.workspaces.length === 0
          ? {
              workspaces: {
                create: {
                  role: WorkspaceRole.ADMIN,
                  workspace: {
                    create: {
                      name: name ? `${name}'s workspace` : "My workspace",
                      plan: parseWorkspaceDefaultPlan(normalizedEmail),
                    },
                  },
                },
              },
            }
          : {}),
      },
    });
    p.outro(
      `Utilisateur existant mis à jour en admin : ${normalizedEmail}. Il configurera le Google Authenticator à la prochaine connexion.`,
    );
  } else {
    await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: name || undefined,
        password: hashedPassword,
        role: UserRole.ADMIN,
        onboardingCategories: [],
        workspaces: {
          create: {
            role: WorkspaceRole.ADMIN,
            workspace: {
              create: {
                name: name ? `${name}'s workspace` : "My workspace",
                plan: parseWorkspaceDefaultPlan(normalizedEmail),
              },
            },
          },
        },
      },
    });
    p.outro(
      `Admin créé : ${normalizedEmail}. Connectez-vous puis scannez le QR code pour configurer le Google Authenticator.`,
    );
  }

  await prisma.$disconnect();
  process.exit(0);
};

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
