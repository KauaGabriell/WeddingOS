export interface DashboardSummaryResult {
  readonly totalGuests: number;
  readonly totalRsvps: number;
  readonly confirmedGuests: number;
  readonly totalGifts: number;
  readonly reservedGifts: number;
  readonly pendingPhotos: number;
}

export interface GetDashboardSummaryUseCase {
  execute(): Promise<DashboardSummaryResult>;
}

export function createGetDashboardSummaryUseCase(dependencies: {
  readonly prisma: any;
}): GetDashboardSummaryUseCase {
  return {
    async execute() {
      const [
        totalGuests,
        totalRsvps,
        confirmedGuests,
        totalGifts,
        reservedGifts,
        pendingPhotos,
      ] = await Promise.all([
        dependencies.prisma.guest.count(),
        dependencies.prisma.rsvpResponse.count(),
        dependencies.prisma.rsvpResponse.count({
          where: { responseStatus: "YES" },
        }),
        dependencies.prisma.gift.count(),
        dependencies.prisma.gift.count({
          where: { status: "RESERVED" },
        }),
        dependencies.prisma.photoPost.count({
          where: { moderationStatus: "PENDING" },
        }),
      ]);

      return {
        totalGuests,
        totalRsvps,
        confirmedGuests,
        totalGifts,
        reservedGifts,
        pendingPhotos,
      };
    },
  };
}
