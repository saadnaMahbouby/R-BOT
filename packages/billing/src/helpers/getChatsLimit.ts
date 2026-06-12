import { Plan } from "@typebot.io/prisma/enum";
import type { Workspace } from "@typebot.io/workspaces/schemas";
import { chatsLimits } from "../constants";

// MODIFIÉ: Toujours retourner infini
export const getChatsLimit = ({
  plan,
  customChatsLimit,
}: Pick<Workspace, "plan"> & {
  customChatsLimit?: Workspace["customChatsLimit"];
}) => {
  return "inf";
};