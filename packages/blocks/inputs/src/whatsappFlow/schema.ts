import {
  blockBaseSchema,
  optionBaseSchema,
} from "@typebot.io/blocks-base/schemas";
import { z } from "@typebot.io/zod";
import { InputBlockType } from "../constants";

export const whatsAppFlowModes = ["published", "draft"] as const;

export const whatsAppFlowOptionsSchema = optionBaseSchema.merge(
  z.object({
    flowId: z.string().optional(),
    flowToken: z.string().optional(),
    screen: z.string().optional(),
    mode: z.enum(whatsAppFlowModes).optional(),
    cta: z.string().optional(),
    bodyText: z.string().optional(),
    flowActionPayload: z.string().optional(),
  }),
);

export const whatsAppFlowBlockSchema = blockBaseSchema.merge(
  z.object({
    type: z.enum([InputBlockType.WHATSAPP_FLOW]),
    options: whatsAppFlowOptionsSchema.optional(),
  }),
);

export type WhatsAppFlowBlock = z.infer<typeof whatsAppFlowBlockSchema>;
