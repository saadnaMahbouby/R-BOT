import { env } from "@typebot.io/env";
import { Plan } from "@typebot.io/prisma/enum";

// MODIFIÉ: Toujours retourner UNLIMITED
export const parseWorkspaceDefaultPlan = (userEmail: string) => {
  return Plan.UNLIMITED;
};