import type { ConfirmAttendanceDependencies, ConfirmAttendanceResult } from "./confirm-attendance.js";
import { createConfirmAttendanceUseCase } from "./confirm-attendance.js";

export interface DeclineAttendanceInput {
  readonly eventId: string;
  readonly guestId: string;
  readonly message?: string;
}

export type DeclineAttendanceResult = ConfirmAttendanceResult;
export type DeclineAttendanceDependencies = ConfirmAttendanceDependencies;

export interface DeclineAttendanceUseCase {
  execute(input: DeclineAttendanceInput): Promise<DeclineAttendanceResult>;
}

export function createDeclineAttendanceUseCase(
  dependencies: DeclineAttendanceDependencies,
): DeclineAttendanceUseCase {
  const confirmAttendance = createConfirmAttendanceUseCase(dependencies);

  return {
    async execute(input) {
      return confirmAttendance.execute({
        eventId: input.eventId,
        guestId: input.guestId,
        responseStatus: "no",
        companionsConfirmed: 0,
        message: input.message,
      });
    },
  };
}
