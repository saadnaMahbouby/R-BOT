import { parseVideoUrl } from "@typebot.io/blocks-bubbles/video/helpers";
import type { VideoBubbleBlock } from "@typebot.io/blocks-bubbles/video/schema";
import { Button } from "@typebot.io/ui/components/Button";
import { Field } from "@typebot.io/ui/components/Field";
import { useState } from "react";
import { UploadButton } from "@/components/ImageUploadContent/UploadButton";
import { DebouncedTextInputWithVariablesButton } from "@/components/inputs/DebouncedTextInput";
import { PexelsPicker } from "@/components/VideoUploadContent/PexelsPicker";
import { VideoLinkEmbedContent } from "@/components/VideoUploadContent/VideoLinkEmbedContent";
import type { FilePathUploadProps } from "@/features/upload/api/generateUploadUrl";

type Tabs = "link" | "pexels" | "upload";

type Props = {
  content?: VideoBubbleBlock["content"];
  onSubmit: (content: VideoBubbleBlock["content"]) => void;
  initialTab?: Tabs;
  uploadFileProps?: FilePathUploadProps;
} & (
  | {
      includedTabs?: Tabs[];
    }
  | {
      excludedTabs?: Tabs[];
    }
);

const defaultDisplayedTabs: Tabs[] = ["link", "pexels"];

export const VideoUploadContent = ({
  content,
  onSubmit,
  initialTab,
  uploadFileProps,
  ...props
}: Props) => {
  const baseTabs: Tabs[] = uploadFileProps
    ? ["upload", ...defaultDisplayedTabs]
    : defaultDisplayedTabs;
  const includedTabs =
    "includedTabs" in props ? (props.includedTabs ?? baseTabs) : baseTabs;
  const excludedTabs =
    "excludedTabs" in props ? (props.excludedTabs ?? []) : [];
  const displayedTabs = baseTabs.filter(
    (tab) => !excludedTabs.includes(tab) && includedTabs.includes(tab),
  );

  const [currentTab, setCurrentTab] = useState<Tabs>(
    initialTab ?? displayedTabs[0],
  );

  const updateCaption = (caption: string) =>
    onSubmit({ ...content, caption });

  const updateUrl = (url: string) => {
    const {
      type,
      url: matchedUrl,
      id,
      videoSizeSuggestion,
    } = parseVideoUrl(url);
    if (currentTab !== "link") {
      // Allow user to update video settings after selection
      setCurrentTab("link");
    }
    return onSubmit({
      ...content,
      type,
      url: matchedUrl,
      id,
      ...(!content?.aspectRatio && !content?.maxWidth
        ? videoSizeSuggestion
        : {}),
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {displayedTabs.includes("upload") && (
          <Button
            variant={currentTab === "upload" ? "outline" : "ghost"}
            onClick={() => setCurrentTab("upload")}
            size="sm"
          >
            Upload
          </Button>
        )}
        {displayedTabs.includes("link") && (
          <Button
            variant={currentTab === "link" ? "outline" : "ghost"}
            onClick={() => setCurrentTab("link")}
            size="sm"
          >
            Link
          </Button>
        )}
        {displayedTabs.includes("pexels") && (
          <Button
            variant={currentTab === "pexels" ? "outline" : "ghost"}
            onClick={() => setCurrentTab("pexels")}
            size="sm"
          >
            Pexels
          </Button>
        )}
      </div>
      {/* Body content to be displayed below conditionally based on currentTab */}
      {currentTab === "upload" && uploadFileProps && (
        <div className="flex justify-center py-2">
          <UploadButton
            fileType="video"
            filePathProps={uploadFileProps}
            onFileUploaded={updateUrl}
            variant="outline-secondary"
          >
            Uploader une vidéo
          </UploadButton>
        </div>
      )}
      {currentTab === "link" && (
        <VideoLinkEmbedContent
          content={content}
          updateUrl={updateUrl}
          onSubmit={onSubmit}
        />
      )}
      {currentTab === "pexels" && <PexelsPicker onVideoSelect={updateUrl} />}
      {uploadFileProps && (
        <Field.Root>
          <Field.Label>Légende (WhatsApp)</Field.Label>
          <DebouncedTextInputWithVariablesButton
            placeholder="Texte affiché sous la vidéo…"
            defaultValue={content?.caption}
            onValueChange={updateCaption}
          />
        </Field.Root>
      )}
    </div>
  );
};
