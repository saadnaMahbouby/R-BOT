import { BubbleBlockType } from "@typebot.io/blocks-bubbles/constants";
import {
  embedBaseUrls,
  embeddableVideoTypes,
  VideoBubbleContentType,
} from "@typebot.io/blocks-bubbles/video/constants";
import type { EmbeddableVideoBubbleContentType } from "@typebot.io/blocks-bubbles/video/schema";
import type { ContinueChatResponse } from "@typebot.io/chat-api/schemas";
import { extensionFromMimeType } from "@typebot.io/lib/extensionFromMimeType";
import { isSvgSrc } from "@typebot.io/lib/utils";
import { convertRichTextToMarkdown } from "@typebot.io/rich-text/convertRichTextToMarkdown";
import { getOrUploadMedia, type UploadMediaCache } from "./getOrUploadMedia";
import type { WhatsAppSendingMessage } from "./schemas";

type Props = {
  message: ContinueChatResponse["messages"][number];
  mediaCache?: UploadMediaCache;
};
export const convertMessageToWhatsAppMessage = async ({
  message,
  mediaCache,
}: Props): Promise<WhatsAppSendingMessage | null> => {
  switch (message.type) {
    case BubbleBlockType.TEXT: {
      if (message.content.type === "markdown")
        throw new Error("Expect rich text message");
      if (!message.content.richText || message.content.richText.length === 0)
        return null;
      const body = convertRichTextToMarkdown(message.content.richText, {
        flavour: "whatsapp",
      });
      if (!body) return null;
      return {
        type: "text",
        text: {
          body: applyPerLineTextDirection(body),
        },
      };
    }
    case BubbleBlockType.IMAGE: {
      if (!message.content.url || isImageUrlNotCompatible(message.content.url))
        return null;
      const caption = message.content.caption?.trim() || undefined;

      // WhatsApp can't display an animated GIF as an "image", so we send it as a video instead.
      if (isGifFileUrl(message.content.url)) {
        if (mediaCache) {
          const mediaId = await getOrUploadMedia({
            url: message.content.url,
            cache: mediaCache,
          });
          if (mediaId) return { type: "video", video: { id: mediaId, caption } };
        }
        return { type: "video", video: { link: message.content.url, caption } };
      }

      if (mediaCache) {
        const mediaId = await getOrUploadMedia({
          url: message.content.url,
          cache: mediaCache,
        });

        if (mediaId) {
          return {
            type: "image",
            image: {
              id: mediaId,
              caption,
            },
          };
        }
      }

      return {
        type: "image",
        image: {
          link: message.content.url,
          caption,
        },
      };
    }
    case BubbleBlockType.AUDIO:
      if (!message.content.url) return null;

      if (mediaCache) {
        const mediaId = await getOrUploadMedia({
          url: message.content.url,
          cache: mediaCache,
        });

        if (mediaId) {
          return {
            type: "audio",
            audio: {
              id: mediaId,
            },
          };
        }
      }

      return {
        type: "audio",
        audio: {
          link: message.content.url,
        },
      };
    case BubbleBlockType.VIDEO:
      if (!message.content.url) return null;
      if (message.content.type === VideoBubbleContentType.URL) {
        const videoCaption = message.content.caption?.trim() || undefined;
        // Try to pre-upload media if credentials are provided
        if (mediaCache) {
          const mediaId = await getOrUploadMedia({
            url: message.content.url,
            cache: mediaCache,
          });

          if (mediaId) {
            return {
              type: "video",
              video: {
                id: mediaId,
                caption: videoCaption,
              },
            };
          }
        }

        // Fall back to using the URL if pre-upload fails or credentials not provided
        return {
          type: "video",
          video: {
            link: message.content.url,
            caption: videoCaption,
          },
        };
      }
      if (
        embeddableVideoTypes.includes(
          message.content.type as EmbeddableVideoBubbleContentType,
        )
      )
        return {
          type: "text",
          text: {
            body: `${embedBaseUrls[message.content.type as EmbeddableVideoBubbleContentType]}/${message.content.id}`,
            preview_url: true,
          },
        };
      return null;
    case BubbleBlockType.EMBED:
      if (!message.content.url) return null;
      const fileExtension = message.content.url.split(".").pop();
      const filename = message.content.url.split("/").pop();
      if (
        fileExtension &&
        Object.entries(extensionFromMimeType).some(
          ([mimeType, extension]) =>
            !mimeType.includes("audio") &&
            !mimeType.includes("video") &&
            !mimeType.includes("image") &&
            extension === fileExtension,
        )
      ) {
        if (mediaCache) {
          const mediaId = await getOrUploadMedia({
            url: message.content.url,
            cache: mediaCache,
          });

          if (mediaId) {
            return {
              type: "document",
              document: {
                id: mediaId,
                filename,
              },
            };
          }
        }

        return {
          type: "document",
          document: {
            link: message.content.url,
            filename,
          },
        };
      }
      return {
        type: "text",
        text: {
          body: message.content.url,
          preview_url: true,
        },
      };
    case "custom-embed":
      if (!message.content.url) return null;
      return {
        type: "text",
        text: {
          body: message.content.url,
          preview_url: true,
        },
      };
  }
};

const rtlCharRegex =
  /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
const rightToLeftMark = "‏";
const leftToRightMark = "‎";

// WhatsApp aligns a whole message by its first strong character, so a leading
// Arabic line forces the whole message to the right. We prepend a per-line
// directional mark so each line (Arabic vs Latin) keeps its own alignment.
export const applyPerLineTextDirection = (text: string): string =>
  text
    .split("\n")
    .map((line) =>
      line.trim().length === 0
        ? line
        : (rtlCharRegex.test(line) ? rightToLeftMark : leftToRightMark) + line,
    )
    .join("\n");

export const isImageUrlNotCompatible = (url: string) =>
  !isHttpUrl(url) || isSvgSrc(url);

export const isHttpUrl = (text: string) =>
  text.startsWith("http://") || text.startsWith("https://");

export const isGifFileUrl = (url: string) => {
  const urlWithoutQueryParams = url.split("?")[0];
  return urlWithoutQueryParams.endsWith(".gif");
};
