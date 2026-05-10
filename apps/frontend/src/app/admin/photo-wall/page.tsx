"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminBottomNav } from "../../../components/admin-bottom-nav/admin-bottom-nav";
import { AdminFeedback } from "../../../components/admin-feedback/admin-feedback";
import { MobileTopBar } from "../../../components/mobile-top-bar/mobile-top-bar";
import { type PhotoPostDto, adminApi } from "../../../lib/api";
import styles from "./page.module.css";

type ModerationFilter = "all" | "pending" | "approved" | "hidden" | "removed";
type ModerationAction = "approved" | "hidden" | "removed";
type LoadState = "loading" | "ready" | "error";

const filters: Array<{ id: ModerationFilter; label: string }> = [
  { id: "all", label: "Todos" },
  { id: "pending", label: "Pendentes" },
  { id: "approved", label: "Aprovados" },
  { id: "hidden", label: "Ocultos" },
  { id: "removed", label: "Removidos" },
];

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

export default function AdminPhotoWallPage() {
  const [items, setItems] = useState<PhotoPostDto[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [activeFilter, setActiveFilter] = useState<ModerationFilter>("pending");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const getFullMediaUrl = (path: string | null) => {
  if (!path) return null;

  if (/^https?:\/\//.test(path) || !path.startsWith("/")) {
    return path;
  }

  return `${API_BASE_URL}${path}`;
};

  useEffect(() => {
    let mounted = true;

    async function loadPhotoPosts() {
      try {
        setLoadState("loading");
        const response = await adminApi.listPhotoWallPosts({
          page: 1,
          pageSize: 100,
          moderationStatus: activeFilter === "all" ? undefined : activeFilter,
        });

        if (!mounted) {
          return;
        }

        setItems(response.items);
        setLoadState("ready");
      } catch (error) {
        if (!mounted) {
          return;
        }

        console.error("Failed to load admin photo wall:", error);
        setLoadState("error");
      }
    }

    void loadPhotoPosts();

    return () => {
      mounted = false;
    };
  }, [activeFilter]);

  const summary = useMemo(() => {
    const totals = { pending: 0, approved: 0, hidden: 0, removed: 0 };
    for (const item of items) {
      totals[item.moderationStatus] += 1;
    }
    return totals;
  }, [items]);

  async function handleModeration(
    photoPostId: string,
    moderationStatus: ModerationAction,
  ) {
    setProcessingId(photoPostId);

    try {
      const updated = await adminApi.moderatePhotoPost(photoPostId, {
        moderationStatus,
      });
      setItems((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch (error) {
      console.error("Failed to moderate post:", error);
      alert("Nao foi possivel moderar este post agora.");
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className={styles.shell}>
      <MobileTopBar
        variant="admin"
        brandHref="/admin/dashboard"
        avatarSrc="/admin-dashboard/profile.png"
      />

      <main className={styles.main}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>Conteudo enviado</p>
          <h1>Moderar Mural</h1>
        </section>

        <section className={styles.summaryGrid}>
          <article>
            <span>Pendentes</span>
            <strong>{summary.pending}</strong>
          </article>
          <article>
            <span>Aprovados</span>
            <strong>{summary.approved}</strong>
          </article>
          <article>
            <span>Ocultos</span>
            <strong>{summary.hidden}</strong>
          </article>
          <article>
            <span>Removidos</span>
            <strong>{summary.removed}</strong>
          </article>
        </section>

        <section className={styles.filterWrap}>
          {filters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className={`${styles.filterButton} ${activeFilter === filter.id ? styles.filterActive : ""}`}
              onClick={() => setActiveFilter(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </section>

        {loadState === "loading" ? (
          <AdminFeedback
            variant="loading"
            title="Carregando mural"
            body="Estamos buscando os posts para moderação."
          />
        ) : null}
        {loadState === "error" ? (
          <AdminFeedback
            variant="error"
            title="Falha ao carregar mural"
            body="Atualize a página para tentar novamente."
          />
        ) : null}

        <section className={styles.feed}>
          {loadState === "ready" && items.length === 0 ? (
            <AdminFeedback
              variant="empty"
              title="Nenhum post encontrado"
              body="Ajuste o filtro para exibir outros status."
            />
          ) : null}

          {items.map((item) => {
            const isProcessing = processingId === item.id;
            const isRemoved = item.moderationStatus === "removed";
            return (
              <article className={styles.postCard} key={item.id}>
                <div className={styles.imageWrap}>
                  {item.mediaUrl ? (
                    <img
                      src={getFullMediaUrl(item.mediaUrl) || ""}
                      alt={`Post de ${item.authorName}`}
                    />
                  ) : (
                    <div className={styles.imagePlaceholder}>
                      <span>Foto enviada</span>
                    </div>
                  )}
                </div>

                <div className={styles.postContent}>
                  <div className={styles.postHeader}>
                    <h2>{item.authorName}</h2>
                    <span
                      className={`${styles.statusBadge} ${styles[`status${item.moderationStatus}`]}`}
                    >
                      {toStatusLabel(item.moderationStatus)}
                    </span>
                  </div>

                  <p>{item.message}</p>
                  <small>Enviado em {formatDate(item.submittedAt)}</small>
                </div>

                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.rejectButton}
                    disabled={isProcessing || isRemoved}
                    onClick={() => handleModeration(item.id, "removed")}
                  >
                    Remover
                  </button>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    disabled={isProcessing || isRemoved}
                    onClick={() => handleModeration(item.id, "hidden")}
                  >
                    Ocultar
                  </button>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    disabled={isProcessing || isRemoved}
                    onClick={() => handleModeration(item.id, "approved")}
                  >
                    Aprovar
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      </main>

      <AdminBottomNav />
    </div>
  );
}

function toStatusLabel(status: PhotoPostDto["moderationStatus"]) {
  if (status === "approved") {
    return "Aprovado";
  }
  if (status === "hidden") {
    return "Oculto";
  }
  if (status === "removed") {
    return "Removido";
  }
  return "Pendente";
}

function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
