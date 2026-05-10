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
        confirmedGuestResponses,
        totalGifts,
        reservedGifts,
        pendingPhotos,
      ] = await Promise.all([
        dependencies.prisma.guest.count({
          where: { status: "ACTIVE" },
        }),
        dependencies.prisma.rsvpResponse.count(),
        dependencies.prisma.rsvpResponse.findMany({
          where: { responseStatus: "YES" },
          select: { guestId: true, companionsConfirmed: true },
          distinct: ["guestId"],
        }),
        dependencies.prisma.gift.count({
          where: { isActive: true },
        }),
        dependencies.prisma.gift.count({
          where: { status: "RESERVED", isActive: true },
        }),
        dependencies.prisma.photoPost.count({
          where: { moderationStatus: "PENDING" },
        }),
      ]);

      return {
        totalGuests,
        totalRsvps,
        confirmedGuests: confirmedGuestResponses.reduce(
          (sum: number, response: { companionsConfirmed: number }) =>
            sum + 1 + response.companionsConfirmed,
          0,
        ),
        totalGifts,
        reservedGifts,
        pendingPhotos,
      };
    },
  };
}
