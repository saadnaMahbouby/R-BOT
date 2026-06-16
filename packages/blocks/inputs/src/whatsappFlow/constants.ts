import type { WhatsAppFlowBlock } from "./schema";

export const defaultWhatsAppFlowOptions = {
  mode: "published",
  cta: "Ouvrir",
  bodyText: "Appuyez pour ouvrir le formulaire.",
} as const satisfies WhatsAppFlowBlock["options"];
