import type { PhotoPostRepository } from "../domain/repositories/photo-post-repository.js";
import type { PhotoStorageProvider } from "../infrastructure/photo-storage-provider.js";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

// 24 horas em segundos.
// O mural pode ficar aberto durante a festa, então 15 minutos é pouco.
const PHOTO_WALL_SIGNED_URL_TTL_SECONDS = 60 * 60 * 24;

export interface ListApprovedPhotoPostsInput {
  readonly page?: number;
  readonly pageSize?: number;
}

export interface PublicPhotoGalleryItem {
  readonly id: string;
  readonly authorName: string;
  readonly message: string;
  readonly mediaUrl: string | null;
  readonly mediaMimeType: string;
  readonly mediaWidth: number | null;
  readonly mediaHeight: number | null;
  readonly submittedAt: Date;
}

export interface ListApprovedPhotoPostsResult {
  readonly items: readonly PublicPhotoGalleryItem[];
  readonly page: number;
  readonly pageSize: number;
}

export interface ListApprovedPhotoPostsUseCase {
  execute(input: ListApprovedPhotoPostsInput): Promise<ListApprovedPhotoPostsResult>;
}

export interface ListApprovedPhotoPostsDependencies {
  readonly photoPostRepository: Pick<PhotoPostRepository, "findMany">;
  readonly photoStorageProvider: Pick<PhotoStorageProvider, "getSignedMediaUrl">;
}

function normalizePagination(input: ListApprovedPhotoPostsInput): {
  page: number;
  pageSize: number;
} {
  return {
    page: input.page ?? DEFAULT_PAGE,
    pageSize: input.pageSize ?? DEFAULT_PAGE_SIZE,
  };
}

export function createListApprovedPhotoPostsUseCase(
  dependencies: ListApprovedPhotoPostsDependencies,
): ListApprovedPhotoPostsUseCase {
  return {
    async execute(input) {
      const { page, pageSize } = normalizePagination(input);

      const approvedPosts = await dependencies.photoPostRepository.findMany({
        moderationStatus: "approved",
        page,
        pageSize,
      });

      const items = await Promise.all(
        approvedPosts.map(async (photoPost) => {
          let mediaUrl: string | null = photoPost.mediaUrl;

          try {
            mediaUrl = await dependencies.photoStorageProvider.getSignedMediaUrl(
              photoPost.mediaStorageKey,
              PHOTO_WALL_SIGNED_URL_TTL_SECONDS,
            );
          } catch {
            mediaUrl = photoPost.mediaUrl ?? null;
          }

          return {
            id: photoPost.id,
            authorName: photoPost.authorName,
            message: photoPost.message,
            mediaUrl,
            mediaMimeType: photoPost.mediaMimeType,
            mediaWidth: photoPost.mediaWidth,
            mediaHeight: photoPost.mediaHeight,
            submittedAt: photoPost.submittedAt,
          };
        }),
      );

      return {
        items,
        page,
        pageSize,
      };
    },
  };
}
