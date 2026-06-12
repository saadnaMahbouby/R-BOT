import { Plan } from "@typebot.io/prisma/enum";
import type { Stripe } from "stripe";

export const prices = {
  [Plan.STARTER]: 0,
  [Plan.PRO]: 0,
} as const;

// MODIFIÉ: Tout illimité (999999999 = infini pratique)
export const chatsLimits = {
  [Plan.FREE]: 999999999,
  [Plan.STARTER]: 999999999,
  [Plan.PRO]: 999999999,
  [Plan.ENTERPRISE]: 999999999,
} as const;

// MODIFIÉ: Seats illimités
export const seatsLimits = {
  [Plan.FREE]: 999,
  [Plan.OFFERED]: 999,
  [Plan.STARTER]: 999,
  [Plan.PRO]: 999,
  [Plan.LIFETIME]: 999,
  [Plan.ENTERPRISE]: 999,
} as const;

export const starterChatTiers = [
  {
    up_to: "inf",
    flat_amount: 0,
  },
] satisfies Stripe.PriceCreateParams.Tier[];

export const proChatTiers = [
  {
    up_to: "inf",
    flat_amount: 0,
  },
] satisfies Stripe.PriceCreateParams.Tier[];