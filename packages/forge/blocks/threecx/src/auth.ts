import { createAuth, option } from "@typebot.io/forge"

export const auth = createAuth({
  type: "encryptedCredentials",
  name: "3CX account",
  schema: option.object({
    // Schéma vide car 3CX n'utilise pas d'authentification centralisée
    // Toutes les configs sont dans les options de l'action
  }),
})
