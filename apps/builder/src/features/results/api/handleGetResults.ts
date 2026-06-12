import { ORPCError } from "@orpc/server";
import { isDefined } from "@typebot.io/lib/utils";
import prisma from "@typebot.io/prisma";
import { resultWithAnswersSchema } from "@typebot.io/results/schemas/results";
import { isReadTypebotForbidden } from "@typebot.io/typebot/helpers/isReadTypebotForbidden";
import type { User } from "@typebot.io/user/schemas";
import { z } from "@typebot.io/zod";
import {
  defaultTimeFilter,
  timeFilterValues,
} from "@/features/analytics/constants";
import {
  parseFromDateFromTimeFilter,
  parseToDateFromTimeFilter,
} from "@/features/analytics/helpers/parseDateFromTimeFilter";

const MAX_LIMIT = 500;

export const getResultsInputSchema = z.object({
  typebotId: z
    .string()
    .describe(
      "[Where to find my bot's ID?](../how-to#how-to-find-my-typebotid)",
    ),
  limit: z.coerce.number().min(1).max(MAX_LIMIT).default(50),
  cursor: z.coerce.number().optional(),
  timeFilter: z.enum(timeFilterValues).default(defaultTimeFilter),
  timeZone: z.string().optional(),
  
  // Système flexible
  phone: z.string().optional(),
  order: z.enum(["asc", "desc"]).default("desc"),
  
  // Raccourcis intelligents
  period: z.enum(["today", "yesterday", "this_week", "this_month", "last_week", "last_month"]).optional(),
  action: z.enum(["last_message", "all_messages", "count_only"]).default("all_messages"),
  
  // Dates manuelles (optionnelles)
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

// Fonction pour calculer les dates selon la période
function calculatePeriodDates(period: string, timeZone?: string) {
  const now = new Date();
  let fromDate: Date, toDate: Date;
  
  switch (period) {
    case "today":
      fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      break;
      
    case "yesterday":
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      fromDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
      toDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59);
      break;
      
    case "this_week":
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      fromDate = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate());
      toDate = now;
      break;
      
    case "this_month":
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
      toDate = now;
      break;
      
    case "last_week":
      const lastWeekStart = new Date(now);
      lastWeekStart.setDate(now.getDate() - now.getDay() - 7);
      const lastWeekEnd = new Date(lastWeekStart);
      lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
      fromDate = lastWeekStart;
      toDate = new Date(lastWeekEnd.getFullYear(), lastWeekEnd.getMonth(), lastWeekEnd.getDate(), 23, 59, 59);
      break;
      
    case "last_month":
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      fromDate = lastMonth;
      toDate = new Date(lastMonthEnd.getFullYear(), lastMonthEnd.getMonth(), lastMonthEnd.getDate(), 23, 59, 59);
      break;
      
    default:
      return { fromDate: null, toDate: null };
  }
  
  return { fromDate, toDate };
}

// Fonction helper pour extraire le dernier message
function getLastMessage(result: any) {
  const allAnswers = result.answersV2.concat(result.answers);
  const userInput = allAnswers.find((answer: any) => 
    answer.content && typeof answer.content === 'string'
  );
  
  return {
    text: userInput?.content || '',
    date: result.createdAt,
    blockId: userInput?.blockId
  };
}

// Fonction pour filtrer par téléphone en utilisant les answers
function filterByPhone(results: any[], phone: string) {
  return results.filter(result => {
    const allAnswers = result.answersV2.concat(result.answers);
    return allAnswers.some((answer: any) => {
      if (typeof answer.content === 'string') {
        return answer.content.includes(phone);
      }
      if (typeof answer.content === 'object' && answer.content !== null) {
        return JSON.stringify(answer.content).includes(phone);
      }
      return false;
    });
  });
}

export const handleGetResults = async ({
  input,
  context: { user },
}: {
  input: z.infer<typeof getResultsInputSchema>;
  context: { user: Pick<User, "id" | "email"> };
}) => {
  const limit = Number(input.limit);
  if (limit < 1 || limit > MAX_LIMIT)
    throw new ORPCError("BAD_REQUEST", {
      message: `limit must be between 1 and ${MAX_LIMIT}`,
    });

  const { cursor, phone, order, dateFrom, dateTo, period, action } = input;

  const typebot = await prisma.typebot.findUnique({
    where: {
      id: input.typebotId,
    },
    select: {
      id: true,
      groups: true,
      collaborators: {
        select: {
          userId: true,
          type: true,
        },
      },
      workspace: {
        select: {
          isSuspended: true,
          isPastDue: true,
          members: {
            select: {
              userId: true,
            },
          },
        },
      },
    },
  });

  if (!typebot || (await isReadTypebotForbidden(typebot, user)))
    throw new ORPCError("NOT_FOUND", { message: "Typebot not found" });

  // Calculer les dates selon la période ou utiliser les dates manuelles
  let fromDate, toDate;
  if (period) {
    const periodDates = calculatePeriodDates(period, input.timeZone);
    fromDate = periodDates.fromDate;
    toDate = periodDates.toDate;
  } else if (dateFrom || dateTo) {
    fromDate = dateFrom ? new Date(dateFrom) : undefined;
    toDate = dateTo ? new Date(dateTo) : undefined;
  } else {
    fromDate = parseFromDateFromTimeFilter(input.timeFilter, input.timeZone);
    toDate = parseToDateFromTimeFilter(input.timeFilter, input.timeZone);
  }

  // Si on filtre par phone, récupérer plus de résultats pour pouvoir filtrer
  const fetchLimit = phone ? Math.min(1000, limit * 10) : limit + 1;

  const results = await prisma.result.findMany({
    take: fetchLimit,
    skip: cursor,
    where: {
      typebotId: typebot.id,
      hasStarted: true,
      isArchived: false,
      createdAt: fromDate
        ? {
            gte: fromDate,
            lte: toDate ?? undefined,
          }
        : undefined,
    },
    orderBy: {
      createdAt: order,
    },
    include: {
      answers: {
        select: {
          blockId: true,
          content: true,
          createdAt: true,
        },
      },
      answersV2: {
        select: {
          blockId: true,
          content: true,
          createdAt: true,
        },
      },
    },
  });

  let filteredResults = results;

  // FILTRAGE PAR NUMÉRO DE TÉLÉPHONE
  if (phone) {
    filteredResults = filterByPhone(results, phone);
  }

  // Limiter les résultats après filtrage
  const limitedResults = filteredResults.slice(0, limit);
  
  let nextCursor: number | undefined;
  if (results.length > limit && isDefined(cursor)) {
    nextCursor = cursor + limit;
  }

  const processedResults = limitedResults.map((r) => ({
    ...r,
    answers: r.answersV2
      .concat(r.answers)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
  }));

  // Traitement selon l'action demandée
// Dans handleGetResults.ts - Remplacer le switch par :
let responseData;
switch (action) {
  case "last_message":
    const sortedForLast = processedResults.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    const lastResult = sortedForLast[0];
   
    responseData = {
      results: [], // Toujours inclure results même si vide
      nextCursor,
      total: filteredResults.length,
      lastMessage: lastResult ? getLastMessage(lastResult) : null,
      hasHistory: filteredResults.length > 0
    };
    break;
    
  case "count_only":
    responseData = {
      results: [], // Toujours inclure results même si vide
      nextCursor,
      total: filteredResults.length,
      lastMessage: null,
      hasHistory: filteredResults.length > 0
    };
    break;
    
  case "all_messages":
  default:
    responseData = {
      results: z.array(resultWithAnswersSchema).parse(processedResults),
      nextCursor,
      total: filteredResults.length,
      lastMessage: processedResults.length > 0 ? getLastMessage(processedResults[0]) : null,
      hasHistory: filteredResults.length > 0
    };
    break;
}

return {
  ...responseData,
  filters: { phone, period, action, dateFrom, dateTo, limit, order }
};
};
