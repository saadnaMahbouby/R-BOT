import { ComparisonOperators } from "@typebot.io/conditions/constants";
import { z } from "@typebot.io/zod";

const mediaSchema = z
  .object({
    link: z.string().optional(),
    id: z.string().optional(),
    caption: z.string().optional(),
  })
  .refine((data) => data.link || data.id, {
    message: "Either link or id must be provided",
  });

const documentSchema = z.object({
  link: z.string().optional(),
  id: z.string().optional(),
  filename: z.string().optional(),
});

const headerSchema = z
  .object({
    type: z.literal("image"),
    image: mediaSchema,
  })
  .or(
    z.object({
      type: z.literal("video"),
      video: mediaSchema,
    }),
  )
  .or(
    z.object({
      type: z.literal("text"),
      text: z.string(),
    }),
  );

const bodySchema = z.object({
  text: z.string(),
});

const actionSchema = z.object({
  buttons: z.array(
    z.object({
      type: z.literal("reply"),
      reply: z.object({ id: z.string(), title: z.string() }),
    }),
  ),
});

const templateSchema = z.object({
  name: z.string(),
  language: z.object({
    code: z.string(),
  }),
});

const listActionSchema = z.object({
  button: z.string(),
  sections: z.array(
    z.object({
      title: z.string().optional(),
      rows: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          description: z.string().optional(),
        })
      ),
    })
  ),
});

const flowActionSchema = z.object({
  name: z.literal("flow"),
  parameters: z.object({
    flow_message_version: z.string(),
    flow_token: z.string().optional(),
    flow_id: z.string(),
    flow_cta: z.string(),
    mode: z.enum(["published", "draft"]).optional(),
    flow_action: z.string().optional(),
    flow_action_payload: z.record(z.unknown()).optional(),
  }),
});

const interactiveSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("button"),
    header: headerSchema.optional(),
    body: bodySchema.optional(),
    action: actionSchema,
  }),
  z.object({
    type: z.literal("list"),
    header: headerSchema.optional(),
    body: bodySchema.optional(),
    action: listActionSchema,
  }),
  z.object({
    type: z.literal("flow"),
    header: headerSchema.optional(),
    body: bodySchema.optional(),
    action: flowActionSchema,
  }),
]);

// https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages#message-object
const sendingMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("text"),
    text: z.object({
      body: z.string(),
      preview_url: z.boolean().optional(),
    }),
  }),
  z.object({
    type: z.literal("image"),
    image: mediaSchema,
  }),
  z.object({
    type: z.literal("audio"),
    audio: mediaSchema,
  }),
  z.object({
    type: z.literal("video"),
    video: mediaSchema,
  }),
  z.object({
    type: z.literal("document"),
    document: documentSchema,
  }),
  z.object({
    type: z.literal("interactive"),
    interactive: interactiveSchema,
  }),
  z.object({
    type: z.literal("template"),
    template: templateSchema,
  }),
]);

const incomingMessageReferral = z.object({
  ctwa_clid: z.string().optional(),
  source_id: z.string().optional(),
});
export type WhatsAppMessageReferral = z.infer<typeof incomingMessageReferral>;

const sharedIncomingMessageFieldsSchema = z.object({
  id: z.string().optional(),
  from: z.string(),
  timestamp: z.string(),
  referral: incomingMessageReferral.optional(),
});

const incomingButtonReplySchema = z.object({
  type: z.literal("button_reply"),
  button_reply: z.object({
    id: z.string(),
    title: z.string(),
  }),
});

const incomingListReplySchema = z.object({
  type: z.literal("list_reply"),
  list_reply: z.object({
    id: z.string(),
    title: z.string(),
  }),
});

const incomingNfmReplySchema = z.object({
  type: z.literal("nfm_reply"),
  nfm_reply: z.object({
    response_json: z.string(),
    body: z.string().optional(),
    name: z.string().optional(),
  }),
});

const incomingInteractiveReplySchema = z.discriminatedUnion("type", [
  incomingButtonReplySchema,
  incomingListReplySchema,
  incomingNfmReplySchema,
]);

export const incomingMessageSchema = z.discriminatedUnion("type", [
  sharedIncomingMessageFieldsSchema.extend({
    type: z.literal("text"),
    text: z.object({
      body: z.string(),
    }),
  }),
  sharedIncomingMessageFieldsSchema.extend({
    type: z.literal("button"),
    button: z.object({
      text: z.string(),
      payload: z.string(),
    }),
  }),
  sharedIncomingMessageFieldsSchema.extend({
    type: z.literal("interactive"),
    interactive: incomingInteractiveReplySchema,
  }),
  sharedIncomingMessageFieldsSchema.extend({
    type: z.literal("image"),
    image: z.object({
      id: z.string(),
      caption: z.string().optional(),
      mime_type: z.string(),
      // AJOUT: Champs Meta API complets
      url: z.string().optional(),
      sha256: z.string().optional(),
      file_size: z.number().optional(),
    }),
  }),
  sharedIncomingMessageFieldsSchema.extend({
    type: z.literal("video"),
    video: z.object({
      id: z.string(),
      caption: z.string().optional(),
      mime_type: z.string(),
      // AJOUT: Champs Meta API complets
      url: z.string().optional(),
      sha256: z.string().optional(),
      file_size: z.number().optional(),
    }),
  }),
  sharedIncomingMessageFieldsSchema.extend({
    type: z.literal("audio"),
    audio: z.object({
      id: z.string(),
      mime_type: z.string(),
      // AJOUT: Champs Meta API complets pour audio
      url: z.string().optional(),
      sha256: z.string().optional(),
      file_size: z.number().optional(),
      voice: z.boolean().optional(),
    }),
  }),
  sharedIncomingMessageFieldsSchema.extend({
    type: z.literal("document"),
    document: z.object({
      id: z.string(),
      caption: z.string().optional(),
      mime_type: z.string(),
      // AJOUT: Champs Meta API complets
      url: z.string().optional(),
      sha256: z.string().optional(),
      file_size: z.number().optional(),
      filename: z.string().optional(),
    }),
  }),
  sharedIncomingMessageFieldsSchema.extend({
    type: z.literal("sticker"),
    sticker: z.object({
      id: z.string(),
      mime_type: z.string(),
      // AJOUT: Champs Meta API complets
      url: z.string().optional(),
      sha256: z.string().optional(),
      file_size: z.number().optional(),
    }),
  }),
  sharedIncomingMessageFieldsSchema.extend({
    type: z.literal("location"),
    location: z.object({
      latitude: z.number(),
      longitude: z.number(),
    }),
  }),
  sharedIncomingMessageFieldsSchema.extend({
    type: z.literal("webhook"),
    webhook: z.object({
      data: z.string().optional(),
    }),
  }),
  sharedIncomingMessageFieldsSchema.extend({
    type: z.literal("reaction"),
    reaction: z.object({
      emoji: z.string().optional(),
    }),
  }),
  sharedIncomingMessageFieldsSchema.extend({
    type: z.literal("contacts"),
    contacts: z.array(
      z.object({
        name: z
          .object({
            formatted_name: z.string(),
          })
          .optional(),
        phones: z
          .array(
            z.object({
              phone: z.string().optional(),
              type: z.string().optional(),
            }),
          )
          .optional(),
      }),
    ),
  }),
  sharedIncomingMessageFieldsSchema.extend({
    type: z.literal("unsupported"),
  }),
  sharedIncomingMessageFieldsSchema.extend({
    type: z.literal("system"),
    system: z.object({
      body: z.string(),
    }),
  }),
]);

const whatsAppError = z.object({
  code: z.number(),
  title: z.string(),
  message: z.string().optional(),
  error_data: z.object({ details: z.string() }),
});
export type WhatsAppIncomingError = z.infer<typeof whatsAppError>;

const incomingStatuses = z.object({
  recipient_id: z.string(),
  // Most likely something with the outbound message
  errors: z.array(whatsAppError).optional(),
});

export const whatsAppWebhookRequestBodySchema = z.object({
  entry: z.array(
    z.object({
      changes: z.array(
        z.object({
          value: z.object({
            metadata: z
              .object({
                phone_number_id: z.string(),
              })
              .optional(),
            contacts: z
              .array(
                z.object({
                  profile: z.object({
                    name: z.string(),
                  }),
                }),
              )
              .optional(),
            messages: z.array(incomingMessageSchema).optional(),
            statuses: z.array(incomingStatuses).optional(),
            // Something wrong about the inbound message
            errors: z.array(whatsAppError).optional(),
            // AJOUT: Support pour _mediaInfo du routeur
            _mediaInfo: z.object({
              url: z.string().optional(),
              sha256: z.string().optional(),
              voice: z.boolean().optional(),
            }).optional(),
          }),
        }),
      ),
    }),
  ),
});

export type WhatsAppWebhookRequestBody = z.infer<
  typeof whatsAppWebhookRequestBodySchema
>;

const whatsAppComparisonSchema = z.object({
  id: z.string(),
  comparisonOperator: z.nativeEnum(ComparisonOperators).optional(),
  value: z.string().optional(),
});
export type WhatsAppComparison = z.infer<typeof whatsAppComparisonSchema>;

export type WhatsAppIncomingMessage = z.infer<typeof incomingMessageSchema>;
export type WhatsAppSendingMessage = z.infer<typeof sendingMessageSchema>;
