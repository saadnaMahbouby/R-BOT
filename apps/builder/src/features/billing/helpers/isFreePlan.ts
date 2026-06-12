import type { Workspace } from "@typebot.io/workspaces/schemas";

// MODIFIÉ: Toujours retourner false = jamais Free, toujours illimité
export const isFreePlan = (workspace?: Pick<Workspace, "plan">) => false;