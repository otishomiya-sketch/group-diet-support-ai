import { prisma } from "@/lib/prisma";

/** 5章:運営(管理者)によるデータアクセスは監査ログを残すこと。 */
export async function logAdminAccess(
  operatorUserId: string,
  action: string,
  targetUserId?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      operatorUserId,
      action,
      targetUserId,
      metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
    },
  });
}
