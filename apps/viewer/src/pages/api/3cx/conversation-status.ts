import type { NextApiRequest, NextApiResponse } from 'next'
import { Pool } from 'pg'

interface DbConfig {
  host: string
  user: string
  password: string
  database: string
  port?: number
}

interface ConversationStatusRequest {
  phoneNumber: string
  dbConfig: DbConfig
  inactivityMinutes?: number
}

interface ConversationStatus {
  status: 'AUCUNE_CONVERSATION' | 'CONVERSATION_FERMEE' | 'CONVERSATION_OUVERTE'
  message: string
  canTransfer: boolean
  phoneNumber: string
  conversation?: any
}

const createDbConnection = (dbConfig: DbConfig) => {
  return new Pool({
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
    port: dbConfig.port || 5432,
    ssl: false,
    connectionTimeoutMillis: 10000,
    max: 1,
  })
}

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method === 'POST') {
    try {
      const { phoneNumber, dbConfig, inactivityMinutes = 1440 }: ConversationStatusRequest = req.body

      if (!phoneNumber || !dbConfig) {
        return res.status(400).json({
          error: 'Missing required parameters'
        })
      }

      const pool = createDbConnection(dbConfig)

      try {
        await pool.query('SELECT 1')
        const phonePattern = `%${phoneNumber}@%`

        const conversationQuery = `
          SELECT 
            cc.id,
            cc.party,
            cc.queue_no,
            cc.taken_by_member_id,
            cc.taken_at,
            cc.cnv_gid,
            EXTRACT(EPOCH FROM (NOW() - COALESCE(
              (SELECT MAX(cm.time_sent) FROM public.chat_message cm WHERE cm.fkid_chat_conversation = cc.id),
              cc.taken_at
            )))/60 as minutes_since_last_activity
          FROM public.chat_conversation cc
          WHERE cc.party LIKE $1
            AND cc.taken_at IS NOT NULL
          ORDER BY cc.taken_at DESC, cc.id DESC
          LIMIT 1
        `

        const conversationResult = await pool.query(conversationQuery, [phonePattern])

        if (conversationResult.rows.length === 0) {
          await pool.end()
          return res.json({
            status: 'AUCUNE_CONVERSATION',
            message: 'Aucune conversation trouvée',
            canTransfer: true,
            phoneNumber: phoneNumber,
            conversation: null
          })
        }

        const conversation = conversationResult.rows[0]
        const minutesSinceLastActivity = parseFloat(conversation.minutes_since_last_activity) || 0

        const lastMessageQuery = `
          SELECT cm.* FROM public.chat_message cm
          WHERE cm.fkid_chat_conversation = $1
          ORDER BY cm.id_message DESC
          LIMIT 1
        `

        const messageResult = await pool.query(lastMessageQuery, [conversation.id])
        const lastMessage = messageResult.rows.length > 0 ? messageResult.rows[0] : null

        // LOGIQUE CORRIGÉE
        const isInactive = minutesSinceLastActivity > inactivityMinutes
        const isSessionClosed = lastMessage?.message_type === 2 || 
                               lastMessage?.message?.toLowerCase().includes('dealt with') ||
                               lastMessage?.message?.toLowerCase().includes('session was')

        let status: ConversationStatus['status']
        let canTransfer: boolean
        let message: string

        if (isInactive || isSessionClosed) {
          // Conversation FERMÉE
          status = 'CONVERSATION_FERMEE'
          canTransfer = false // Traiter dans Typebot
          message = isSessionClosed ? 'Conversation fermée - traiter dans Typebot' : 
                   `Inactive depuis ${Math.round(minutesSinceLastActivity)}min - traiter dans Typebot`
        } else {
          // Conversation OUVERTE  
          status = 'CONVERSATION_OUVERTE'
          canTransfer = true // Transférer vers 3CX
          message = conversation.taken_by_member_id ? 
                   `Agent ${conversation.taken_by_member_id} en ligne - transférer vers 3CX` :
                   'Conversation en attente - transférer vers 3CX'
        }

        await pool.end()

        const response: ConversationStatus = {
          status,
          message,
          canTransfer,
          phoneNumber,
          conversation: {
            id: conversation.id,
            party: conversation.party,
            queue: conversation.queue_no,
            takenByAgent: conversation.taken_by_member_id,
            takenAt: conversation.taken_at,
            lastActivityMinutesAgo: Math.round(minutesSinceLastActivity),
            lastMessage
          }
        }

        console.log(`[3CX API v2] ${status}, canTransfer: ${canTransfer}, inactivity: ${Math.round(minutesSinceLastActivity)}min`)
        res.json(response)

      } catch (dbError: any) {
        await pool.end()
        res.status(500).json({
          error: 'Database error',
          message: dbError.message
        })
      }

    } catch (error: any) {
      res.status(500).json({
        error: 'Internal error',
        message: error.message
      })
    }
  } else if (req.method === 'GET') {
    res.json({
      status: 'OK',
      service: '3CX Conversation Status API v2',
      logic: {
        'CONVERSATION_OUVERTE': 'canTransfer: true (vers 3CX)',
        'CONVERSATION_FERMEE': 'canTransfer: false (vers Typebot)',
        'AUCUNE_CONVERSATION': 'canTransfer: true (vers 3CX)'
      }
    })
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}

export default handler
