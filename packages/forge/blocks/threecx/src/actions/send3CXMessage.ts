import { option } from '@typebot.io/forge'

export const send3CXMessage = {
  name: 'Send to 3CX (Meta Format)',
  options: option.object({
    // Configuration 3CX
    webhookUrl: option.string.layout({
      label: 'Webhook URL 3CX',
      placeholder: 'https://your-3cx.com/webhook',
      isRequired: true,
      withVariableButton: true,
    }),
    
    // NOUVEAU: Meta Body Data (remplace le besoin d'API calls)
    metaBodyData: option.string.layout({
      label: 'Meta Body Data',
      placeholder: '{{debug_info}}',
      helperText: 'Variable Meta Body avec toutes les données webhook',
      isRequired: false,
      inputType: 'textarea',
      withVariableButton: true,
    }),
    
    // Meta Access Token (optionnel maintenant)
    metaAccessToken: option.string.layout({
      label: 'Meta Access Token (fallback)',
      placeholder: 'EAAG...',
      helperText: 'Token Meta - utilisé seulement si Meta Body indisponible',
      isRequired: false,
      withVariableButton: true,
    }),
    
    // IDs Meta
    businessAccountId: option.string.layout({
      label: 'Business Account ID',
      placeholder: '435211399683829',
      isRequired: true,
      withVariableButton: true,
    }),
    
    phoneNumberId: option.string.layout({
      label: 'Phone Number ID',
      placeholder: '415516888322049',
      isRequired: true,
      withVariableButton: true,
    }),
    
    displayPhoneNumber: option.string.layout({
      label: 'Display Phone Number',
      placeholder: '41011100',
      isRequired: true,
      withVariableButton: true,
    }),
    
    // Contact info
    fromNumber: option.string.layout({
      label: 'From Number (wa_id)',
      placeholder: '22241956109 ou {{from_number}}',
      helperText: 'Numéro WhatsApp de l\'expéditeur',
      isRequired: true,
      withVariableButton: true,
    }),
    
    contactName: option.string.layout({
      label: 'Contact Name',
      placeholder: '{{contact_name}} ou Nom du contact',
      isRequired: false,
      withVariableButton: true,
    }),
    
    // Message
    messageText: option.string.layout({
      label: 'Message Text',
      placeholder: 'Votre message ici...',
      helperText: 'Corps du message texte',
      isRequired: false,
      inputType: 'textarea',
      withVariableButton: true,
    }),
    
    // Type de message
    messageType: option.string.layout({
      label: 'Message Type',
      placeholder: 'text',
      defaultValue: 'text',
      helperText: 'Type: text, image, video, audio, document, sticker',
      isRequired: false,
      withVariableButton: true,
    }),
    
    // Media ID (extrait automatiquement du Meta Body)
    mediaId: option.string.layout({
      label: 'Media ID',
      placeholder: '{{media_id}} ou ID manuel',
      helperText: 'ID du média - extrait automatiquement du Meta Body',
      isRequired: false,
      withVariableButton: true,
    }),
    
    // Media MIME Type (extrait automatiquement du Meta Body)
    mediaMimeType: option.string.layout({
      label: 'Media MIME Type (optionnel)',
      placeholder: '{{mime_type}}',
      helperText: 'MIME type - extrait automatiquement du Meta Body si disponible',
      isRequired: false,
      withVariableButton: true,
    }),
    
    // Media Caption
    mediaCaption: option.string.layout({
      label: 'Media Caption (optionnel)',
      placeholder: 'Légende de la photo/vidéo',
      isRequired: false,
      inputType: 'textarea',
      withVariableButton: true,
    }),
    
    // Debug
    enableDebug: option.boolean.layout({
      label: 'Enable Debug Logs',
      defaultValue: false,
      helperText: 'Affiche les logs détaillés pour le debugging',
    }),
  }),
}
