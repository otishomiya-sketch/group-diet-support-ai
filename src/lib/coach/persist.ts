import { prisma } from "@/lib/prisma";
import { getConfig } from "@/lib/config/system-config";
import { generateCoachMessage, type CoachMessageType } from "@/lib/coach/prompt";

export interface SendCoachMessageInput {
  messageType: CoachMessageType;
  variables: Record<string, unknown>;
  userId?: string;
  teamId?: string;
}

/**
 * 1.5節:CoachMessageログとして rawOutput / filteredOutput を両方保持する。
 * 実際の配信(LINE送信)は呼び出し側で filteredOutput を使って行う。
 */
export async function sendCoachMessage(input: SendCoachMessageInput) {
  const variables =
    input.messageType === "safety_resource"
      ? {
          ...input.variables,
          consultationResourceText: await getConfig("safety.consultationResourceText"),
        }
      : input.variables;

  const result = await generateCoachMessage({
    messageType: input.messageType,
    variables,
  });

  const record = await prisma.coachMessage.create({
    data: {
      userId: input.userId,
      teamId: input.teamId,
      messageType: input.messageType,
      rawOutput: result.rawOutput,
      filteredOutput: result.filteredOutput,
      filterFlags: result.filterFlags ?? undefined,
    },
  });

  return record;
}
