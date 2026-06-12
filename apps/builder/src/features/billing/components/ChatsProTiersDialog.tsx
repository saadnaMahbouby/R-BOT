import { useTranslate } from "@tolgee/react";
import { Dialog } from "@typebot.io/ui/components/Dialog";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

// MODIFIÉ: Simplifié car tout est illimité maintenant
export const ChatsProTiersDialog = ({ isOpen, onClose }: Props) => {
  const { t } = useTranslate();

  return (
    <Dialog.Root isOpen={isOpen} onClose={onClose}>
      <Dialog.Popup>
        <Dialog.Title>{t("billing.tiersModal.heading")}</Dialog.Title>
        <Dialog.CloseButton />
        <div style={{ padding: "20px", textAlign: "center" }}>
          <p style={{ fontSize: "18px", fontWeight: "bold" }}>
            ✨ Chats illimités ✨
          </p>
          <p>Votre plan inclut un nombre illimité de chats.</p>
        </div>
      </Dialog.Popup>
    </Dialog.Root>
  );
};