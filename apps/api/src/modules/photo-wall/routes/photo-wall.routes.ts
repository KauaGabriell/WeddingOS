import type { FastifyPluginAsync, preHandlerHookHandler } from "fastify";
import { PrismaAuditLogRepository, createAuditLogWriter } from "../../admin-backoffice/index.js";
import { PrismaGuestRepository } from "../../guests-rsvp/index.js";
import {
  errorResponseSchema,
  guestRoute,
  type GuestPrincipal,
  type HttpStatusError,
} from "../../shared/index.js";
import {
  createCreatePhotoPostUseCase,
  createListApprovedPhotoPostsUseCase,
  PHOTO_WALL_HTTP_CONTRACT,
  PHOTO_WALL_HTTP_SCHEMAS,
  PhotoWallApplicationError,
  PrismaPhotoPostRepository,
  StorageBackedPhotoStorageProvider,
  type PhotoWallCreatePhotoPostRequestDto,
} from "../index.js";

export const PHOTO_WALL_ROUTE_ACCESS = {
  listPhotoWallPosts: guestRoute(),
  createPhotoPost: guestRoute(),
};

interface RegisterPhotoWallRoutesOptions {
  readonly preHandler?: preHandlerHookHandler;
}

function serializePhotoPost(photoPost: {
  id: string;
  guestId: string;
  authorName: string;
  message: string;
  mediaStorageKey: string;
  mediaUrl: string | null;
  mediaMimeType: string;
  mediaSizeBytes: number;
  mediaWidth: number | null;
  mediaHeight: number | null;
  moderationStatus: string;
  submittedAt: Date;
  approvedAt: Date | null;
  hiddenAt: Date | null;
  moderatedByAdminUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...photoPost,
    submittedAt: photoPost.submittedAt.toISOString(),
    approvedAt: photoPost.approvedAt?.toISOString() ?? null,
    hiddenAt: photoPost.hiddenAt?.toISOString() ?? null,
    createdAt: photoPost.createdAt.toISOString(),
    updatedAt: photoPost.updatedAt.toISOString(),
  };
}

function isLikelyBase64(value: string): boolean {
  const normalized = value.trim();

  return normalized.length > 0 && normalized.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(normalized);
}

function decodeBase64Body(fileBodyBase64: string): Buffer {
  const normalized = fileBodyBase64.trim();

  if (!isLikelyBase64(normalized)) {
    throw new PhotoWallApplicationError("unsupported_media_type");
  }

  return Buffer.from(normalized, "base64");
}

function sendPhotoWallError(error: PhotoWallApplicationError, reply: any) {
  const codeByReason: Record<PhotoWallApplicationError["reason"], string> = {
    guest_not_found: "GUEST_NOT_FOUND",
    guest_inactive: "GUEST_INACTIVE",
    unsupported_media_type: "UNSUPPORTED_MEDIA_TYPE",
    unsupported_file_extension: "UNSUPPORTED_FILE_EXTENSION",
    media_type_extension_mismatch: "MEDIA_TYPE_EXTENSION_MISMATCH",
    file_too_large: "FILE_TOO_LARGE",
  };

  return reply.code(error.statusCode).send({
    code: codeByReason[error.reason],
    message: "Request could not be completed",
  });
}

export const registerPhotoWallRoutes: FastifyPluginAsync<RegisterPhotoWallRoutesOptions> = async (
  app,
  options,
) => {
  const guestRepository = new PrismaGuestRepository(
    app.prisma.guest as unknown as ConstructorParameters<typeof PrismaGuestRepository>[0],
  );
  const photoPostRepository = new PrismaPhotoPostRepository(
    app.prisma.photoPost as unknown as ConstructorParameters<typeof PrismaPhotoPostRepository>[0],
  );
  const photoStorageProvider = new StorageBackedPhotoStorageProvider(app.storageClient);
  const auditLogWriter = createAuditLogWriter({
    auditLogRepository: new PrismaAuditLogRepository(
      app.prisma.auditLog as unknown as ConstructorParameters<typeof PrismaAuditLogRepository>[0],
    ),
  });
  const listApprovedPhotoPosts = createListApprovedPhotoPostsUseCase({
    photoPostRepository,
    photoStorageProvider,
  });
  const createPhotoPost = createCreatePhotoPostUseCase({
    guestRepository,
    photoStorageProvider,
    photoPostRepository,
    auditLogWriter,
  });

  await app.register(async (photoWallRoutes) => {
    photoWallRoutes.setErrorHandler((error, _request, reply) => {
      const httpError = error as Partial<HttpStatusError>;

      if (httpError.statusCode === 401) {
        return reply.code(401).send({
          code: "GUEST_AUTH_REQUIRED",
          message: "Authentication required",
        });
      }

      if (httpError.statusCode === 403) {
        return reply.code(403).send({
          code: "GUEST_ACCESS_FORBIDDEN",
          message: "Access forbidden",
        });
      }

      throw error;
    });

    photoWallRoutes.get("/", {
      ...PHOTO_WALL_ROUTE_ACCESS.listPhotoWallPosts,
      preHandler: options.preHandler,
      schema: {
        tags: [...PHOTO_WALL_HTTP_CONTRACT.tags],
        querystring: PHOTO_WALL_HTTP_SCHEMAS.queries.galleryList,
        response: {
          200: PHOTO_WALL_HTTP_SCHEMAS.responses.photoGalleryList,
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
      },
      handler: async (request, reply) => {
        const query = request.query as { page?: number; pageSize?: number };
        const result = await listApprovedPhotoPosts.execute({
          page: query.page,
          pageSize: query.pageSize,
        });

        return reply.code(200).send({
          items: result.items.map((item) => ({
            ...item,
            submittedAt: item.submittedAt.toISOString(),
          })),
          page: result.page,
          pageSize: result.pageSize,
        });
      },
    });

    photoWallRoutes.post("/posts", {
      ...PHOTO_WALL_ROUTE_ACCESS.createPhotoPost,
      preHandler: options.preHandler,
      schema: {
        tags: [...PHOTO_WALL_HTTP_CONTRACT.tags],
        body: PHOTO_WALL_HTTP_SCHEMAS.bodies.createPhotoPost,
        response: {
          200: PHOTO_WALL_HTTP_SCHEMAS.responses.photoPostSubmission,
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      handler: async (request, reply) => {
        const auth = request.auth as GuestPrincipal;
        const body = request.body as PhotoWallCreatePhotoPostRequestDto;

        try {
          const result = await createPhotoPost.execute({
            guestId: auth.guestId,
            authorName: body.authorName,
            message: body.message,
            fileName: body.fileName,
            fileBody: decodeBase64Body(body.fileBodyBase64),
            mediaMimeType: body.mediaMimeType,
            mediaSizeBytes: body.mediaSizeBytes,
            mediaWidth: body.mediaWidth,
            mediaHeight: body.mediaHeight,
            requestId: request.correlationId,
          });

          return reply.code(200).send({
            photoPost: serializePhotoPost(result.photoPost),
            mediaUrl: result.mediaUrl,
          });
        } catch (error) {
          if (error instanceof PhotoWallApplicationError) {
            return sendPhotoWallError(error, reply);
          }

          throw error;
        }
      },
    });
  }, {
    prefix: PHOTO_WALL_HTTP_CONTRACT.routePrefix,
  });
};
