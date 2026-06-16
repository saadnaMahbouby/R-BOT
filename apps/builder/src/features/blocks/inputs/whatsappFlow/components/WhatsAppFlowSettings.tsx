import { defaultWhatsAppFlowOptions } from "@typebot.io/blocks-inputs/whatsappFlow/constants";
import type { WhatsAppFlowBlock } from "@typebot.io/blocks-inputs/whatsappFlow/schema";
import { Field } from "@typebot.io/ui/components/Field";
import { Switch } from "@typebot.io/ui/components/Switch";
import type { Variable } from "@typebot.io/variables/schemas";
import { DebouncedTextInputWithVariablesButton } from "@/components/inputs/DebouncedTextInput";
import { VariablesCombobox } from "@/components/inputs/VariablesCombobox";

type Props = {
  options: WhatsAppFlowBlock["options"];
  onOptionsChange: (options: WhatsAppFlowBlock["options"]) => void;
};

export const WhatsAppFlowSettings = ({ options, onOptionsChange }: Props) => {
  const update = (patch: Partial<NonNullable<WhatsAppFlowBlock["options"]>>) =>
    onOptionsChange({ ...options, ...patch });

  return (
    <div className="flex flex-col gap-4 p-2">
      <Field.Root>
        <Field.Label>Flow ID (Meta)</Field.Label>
        <DebouncedTextInputWithVariablesButton
          placeholder="1234567890"
          defaultValue={options?.flowId}
          onValueChange={(flowId) => update({ flowId })}
        />
      </Field.Root>

      <Field.Root>
        <Field.Label>Texte du bouton (CTA)</Field.Label>
        <DebouncedTextInputWithVariablesButton
          placeholder={defaultWhatsAppFlowOptions.cta}
          defaultValue={options?.cta}
          onValueChange={(cta) => update({ cta })}
        />
      </Field.Root>

      <Field.Root>
        <Field.Label>Message d'accompagnement</Field.Label>
        <DebouncedTextInputWithVariablesButton
          placeholder={defaultWhatsAppFlowOptions.bodyText}
          defaultValue={options?.bodyText}
          onValueChange={(bodyText) => update({ bodyText })}
        />
      </Field.Root>

      <Field.Root>
        <Field.Label>Écran de départ (screen, optionnel)</Field.Label>
        <DebouncedTextInputWithVariablesButton
          placeholder="WELCOME_SCREEN"
          defaultValue={options?.screen}
          onValueChange={(screen) => update({ screen })}
        />
      </Field.Root>

      <Field.Root>
        <Field.Label>Flow token (optionnel)</Field.Label>
        <DebouncedTextInputWithVariablesButton
          placeholder="Auto (id du bloc)"
          defaultValue={options?.flowToken}
          onValueChange={(flowToken) => update({ flowToken })}
        />
      </Field.Root>

      <Field.Root>
        <Field.Label>Données initiales (JSON, optionnel)</Field.Label>
        <DebouncedTextInputWithVariablesButton
          placeholder='{"key":"value"}'
          defaultValue={options?.flowActionPayload}
          onValueChange={(flowActionPayload) => update({ flowActionPayload })}
        />
      </Field.Root>

      <Field.Root className="flex-row items-center">
        <Switch
          checked={(options?.mode ?? defaultWhatsAppFlowOptions.mode) === "draft"}
          onCheckedChange={(isDraft) =>
            update({ mode: isDraft ? "draft" : "published" })
          }
        />
        <Field.Label>Mode brouillon (draft)</Field.Label>
      </Field.Root>

      <Field.Root>
        <Field.Label>Enregistrer la réponse dans la variable</Field.Label>
        <VariablesCombobox
          initialVariableId={options?.variableId}
          onSelectVariable={(variable?: Pick<Variable, "id">) =>
            update({ variableId: variable?.id })
          }
        />
      </Field.Root>
    </div>
  );
};
