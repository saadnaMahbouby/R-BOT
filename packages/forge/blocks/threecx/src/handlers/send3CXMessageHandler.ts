import { createActionHandler } from "@typebot.io/forge"
import ky from "ky"
import { send3CXMessage } from "../actions/send3CXMessage"

export const send3CXMessageHandler = createActionHandler(send3CXMessage, {
  server: async ({ options, logs }) => {
    const {
      webhookUrl,
      businessAccountId,
      phoneNumberId,
      displayPhoneNumber,
      fromNumber,
      contactName,
      messageText,
      messageType = 'text',
      mediaId,
      enableDebug = false,
      // metaBodyData peut être undefined - gestion TypeScript
      metaBodyData
    } = options

    const debug = (msg: string, data?: any) => {
      if (enableDebug) {
        console.log(`[3CX Meta] ${msg}`, data ? JSON.stringify(data, null, 2) : '')
        logs.add(msg)
      }
    }

    debug('Handler started - Using Meta Body data')

    // Validation
    if (!webhookUrl || !businessAccountId || !phoneNumberId || !displayPhoneNumber || !fromNumber) {
      const error = 'Missing required fields'
      logs.add(`❌ ${error}`)
      console.error(`[3CX Meta] ${error}`)
      return
    }

    const cleanNumber = fromNumber.replace(/[^0-9]/g, '')
    const msgType = (messageType || 'text').toLowerCase().trim()

    try {
      const messageId = `typebot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const timestamp = Math.floor(Date.now() / 1000).toString()

      // Construire le message
      const messageObj: Record<string, any> = {
        from: cleanNumber,
        id: messageId,
        timestamp: timestamp,
        type: msgType
      }

      // Fonction pour extraire les données complètes du Meta Body
      const extractMediaFromMetaBody = (metaBody: string | undefined, targetMediaId: string | undefined) => {
        try {
          if (!metaBody || !targetMediaId) {
            debug('No Meta Body data or media ID provided')
            return null
          }
          
          const parsed = JSON.parse(metaBody)
          const messages = parsed.entry?.[0]?.changes?.[0]?.value?.messages || []
          
          debug(`Searching for media ID ${targetMediaId} in ${messages.length} messages`)
          
          for (const msg of messages) {
            // Audio
            if (msg.audio?.id === targetMediaId) {
              debug('✅ Found audio in Meta Body', msg.audio)
              return {
                type: 'audio',
                id: msg.audio.id,
                mime_type: msg.audio.mime_type,
                url: msg.audio.url,
                sha256: msg.audio.sha256,
                voice: msg.audio.voice
              }
            }
            
            // Image  
            if (msg.image?.id === targetMediaId) {
              debug('✅ Found image in Meta Body', msg.image)
              return {
                type: 'image',
                id: msg.image.id,
                mime_type: msg.image.mime_type,
                url: msg.image.url,
                sha256: msg.image.sha256,
                caption: msg.image.caption
              }
            }
            
            // Video
            if (msg.video?.id === targetMediaId) {
              debug('✅ Found video in Meta Body', msg.video)
              return {
                type: 'video',
                id: msg.video.id,
                mime_type: msg.video.mime_type,
                url: msg.video.url,
                sha256: msg.video.sha256,
                caption: msg.video.caption
              }
            }
            
            // Document
            if (msg.document?.id === targetMediaId) {
              debug('✅ Found document in Meta Body', msg.document)
              return {
                type: 'document',
                id: msg.document.id,
                mime_type: msg.document.mime_type,
                url: msg.document.url,
                sha256: msg.document.sha256,
                caption: msg.document.caption,
                filename: msg.document.filename
              }
            }
            
            // Sticker
            if (msg.sticker?.id === targetMediaId) {
              debug('✅ Found sticker in Meta Body', msg.sticker)
              return {
                type: 'sticker',
                id: msg.sticker.id,
                mime_type: msg.sticker.mime_type,
                url: msg.sticker.url,
                sha256: msg.sticker.sha256
              }
            }
          }
          
          debug(`❌ Media ID ${targetMediaId} not found in Meta Body`)
        } catch (error) {
          debug('❌ Error parsing Meta Body:', error)
        }
        return null
      }

      // Ajouter le contenu selon le type
      switch (msgType) {
        case 'text':
          messageObj.text = { body: messageText || '' }
          break

        case 'audio':
        case 'image':
        case 'video':
        case 'document':
        case 'sticker':
          if (mediaId) {
            const mediaInfo = extractMediaFromMetaBody(metaBodyData, mediaId)
            
            if (mediaInfo) {
              // Utiliser les données complètes du Meta Body
              messageObj[msgType] = {
                id: mediaInfo.id,
                mime_type: mediaInfo.mime_type,
                ...(mediaInfo.url && { url: mediaInfo.url }),
                ...(mediaInfo.sha256 && { sha256: mediaInfo.sha256 }),
                ...(mediaInfo.voice !== undefined && { voice: mediaInfo.voice }),
                ...(mediaInfo.caption && { caption: mediaInfo.caption }),
                ...(mediaInfo.filename && { filename: mediaInfo.filename })
              }
              
              debug(`✅ Using Meta Body data for ${msgType}`, messageObj[msgType])
            } else {
              // Fallback minimal si pas trouvé
              messageObj[msgType] = {
                id: mediaId,
                ...(msgType === 'audio' && { voice: true })
              }
              
              debug(`⚠️ Using minimal data for ${msgType} - media not found in Meta Body`)
            }
          }
          break

        default:
          messageObj.text = { body: messageText || 'Unknown message type' }
      }

      // Construction du payload 3CX
      const payload = {
        object: "whatsapp_business_account",
        entry: [{
          id: businessAccountId,
          changes: [{
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: displayPhoneNumber,
                phone_number_id: phoneNumberId
              },
              contacts: [{
                profile: {
                  name: contactName || cleanNumber
                },
                wa_id: cleanNumber
              }],
              messages: [messageObj]
            }
          }]
        }]
      }

      debug('Final payload for 3CX', payload)

      // Envoi vers 3CX
      const response = await ky.post(webhookUrl, {
        json: payload,
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Typebot-3CX-Handler/1.0'
        }
      })

      const responseText = await response.text()
      debug(`3CX Response (${response.status})`, responseText)

      logs.add(`✅ Sent to 3CX successfully (${response.status}) - Type: ${msgType}`)

    } catch (error: any) {
      const errorMsg = `Error sending to 3CX: ${error.message}`
      logs.add(`❌ ${errorMsg}`)
      console.error('[3CX Meta] ❌ Error:', error)

      if (error.response) {
        try {
          const errorText = await error.response.text()
          logs.add(`Response details: ${errorText}`)
          console.error('[3CX Meta] Response details:', errorText)
        } catch (e) {
          // Ignore parsing error
        }
      }
    }
  },
})
