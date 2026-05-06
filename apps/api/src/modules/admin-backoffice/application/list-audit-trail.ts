import type { AuditLogRepository } from "../domain/index.js";

export interface ListAuditTrailInput {
  readonly page?: number;
  readonly pageSize?: number;
  readonly actorType?: string;
  readonly entityType?: string;
  readonly actionType?: string;
}

export interface ListAuditTrailResult {
  readonly items: readonly any[];
  readonly page: number;
  readonly pageSize: number;
}

export interface ListAuditTrailUseCase {
  execute(input: ListAuditTrailInput): Promise<ListAuditTrailResult>;
}

export function createListAuditTrailUseCase(dependencies: {
  readonly auditLogRepository: AuditLogRepository;
}): ListAuditTrailUseCase {
  return {
    async execute(input) {
      const page = input.page ?? 1;
      const pageSize = input.pageSize ?? 20;

      const items = await dependencies.auditLogRepository.findMany({
        page,
        pageSize,
        actorType: input.actorType as any,
        entityType: input.entityType,
        actionType: input.actionType,
      });

      return {
        items,
        page,
        pageSize,
      };
    },
  };
}
