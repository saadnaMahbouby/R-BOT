import { useTranslate } from "@tolgee/react";
import type { WorkspaceInApp } from "@/features/workspace/WorkspaceProvider";

type Props = {
  workspace: WorkspaceInApp;
};

// MODIFIÉ: Version simplifiée sans limites
export const UsageProgressBars = ({ workspace }: Props) => {
  const { t } = useTranslate();

  return (
    <div className="flex flex-col gap-6">
      <h2>{t("billing.usage.heading")}</h2>
      <div className="flex flex-col gap-3">
        <div className="flex justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xl">{t("billing.usage.chats.heading")}</h3>
          </div>
          <div className="flex items-center gap-2">
            <p className="font-bold text-green-600">∞ Illimité</p>
          </div>
        </div>
      </div>
    </div>
  );
};