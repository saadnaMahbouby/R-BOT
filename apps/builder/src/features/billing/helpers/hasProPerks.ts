import type { Workspace } from "@typebot.io/workspaces/schemas";

// MODIFIÉ: Toujours retourner true = toujours les fonctionnalités Pro
export const hasProPerks = (workspace?: Pick<Workspace, "plan">) => true;