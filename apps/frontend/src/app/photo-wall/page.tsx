"use client";

import { useEffect, useMemo, useState } from "react";
import { GuestBottomNav } from "../../components/guest-bottom-nav/guest-bottom-nav";
import { MobileTopBar } from "../../components/mobile-top-bar/mobile-top-bar";
import { PublicFeedback } from "../../components/public-feedback/public-feedback";
import { type PhotoGalleryItemDto, guestApi } from "../../lib/api";
import styles from "./page.module.css";

type LoadState = "loading" | "ready" | "error";

const fallbackItems: PhotoGalleryItemDto[] = [
  {
    id: "fallback-1",
    authorName: "Marina & Joao",
    message: "A decoracao estava simplesmente impecavel. Que noite!",
    mediaUrl: "/guest-home/mural-card.png",
    mediaMimeType: "image/png",
    mediaWidth: null,
    mediaHeight: null,
    submittedAt: new Date().toISOString(),
  },
  {
    id: "fallback-2",
    authorName: "Familia Azevedo",
    message: "Memoria especial para guardar no coracao.",
    mediaUrl: "/rsvp/golden-wedding-rings.webp",
    mediaMimeType: "image/webp",
    mediaWidth: null,
    mediaHeight: null,
    submittedAt: new Date().toISOString(),
  },
  {
    id: "fallback-3",
    authorName: "Camila",
    message: "Energia linda e muitos sorrisos!",
    mediaUrl: "/rsvp/ideias-para-cha-de-panela-22.jpg",
    mediaMimeType: "image/jpeg",
    mediaWidth: null,
    mediaHeight: null,
    submittedAt: new Date().toISOString(),
  },
];

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

export default function PhotoWallPage() {
  const [items, setItems] = useState<PhotoGalleryItemDto[]>(fallbackItems);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  function getFullMediaUrl(path: string | null) {
    if (!path) return "";
    if (path.startsWith("http") || path.startsWith("/")) return path;
    return `${API_BASE_URL}/${path}`;
  }

  useEffect(() => {
    let isMounted = true;

    async function loadPhotoWall() {
      try {
        const response = await guestApi.listPhotoWall({
          page: 1,
          pageSize: 30,
        });

        if (!isMounted) {
          return;
        }

        setItems(response.items.length > 0 ? response.items : fallbackItems);
        setLoadState("ready");
      } catch {
        if (!isMounted) {
          return;
        }

        setItems(fallbackItems);
        setLoadState("error");
      }
    }

    loadPhotoWall();
    return () => {
      isMounted = false;
    };
  }, []);

  const featured = items[0] ?? null;
  const gallery = useMemo(() => items.slice(1), [items]);

  return (
    <div className={styles.shell}>
      <MobileTopBar
        variant="guest"
        brandHref="/guest/home"
        avatarSrc="/guest-home/profile-avatar.jpg"
      />

      <main className={styles.main}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>Mural de Fotos</p>
          <h1>Mural de Fotos</h1>
          <p>
            Capture e compartilhe os momentos magicos da nossa celebracao. Suas
            memorias tornam nossa historia ainda mais completa.
          </p>
        </section>

        <section className={styles.actions}>
          <a className={styles.uploadButton} href="/photo-wall/new">
            <img src="/guest-home/nav-wall.svg" alt="" aria-hidden="true" />
            <span>Enviar Foto</span>
          </a>
        </section>

        {loadState === "error" ? (
          <PublicFeedback
            variant="error"
            title="Modo visual ativo"
            body="Conecte sua sessao para carregar as fotos reais do mural."
            actionHref="/guest/login/code"
            actionLabel="Entrar com codigo"
          />
        ) : null}

        <section className={styles.gallery}>
          {loadState === "ready" && items.length === 0 ? (
            <PublicFeedback
              variant="empty"
              title="Nenhuma foto aprovada"
              body="Quando houver publicacoes aprovadas, elas aparecerao aqui."
            />
          ) : null}
          {featured ? (
            <article className={styles.featuredPost}>
              <img
                src={getFullMediaUrl(featured.mediaUrl)}
                alt={featured.message}
              />
              <div className={styles.featuredGradient} />
              <div className={styles.featuredContent}>
                <p>Por {featured.authorName}</p>
                <h2>{featured.message}</h2>
                <span>{formatSubmittedAt(featured.submittedAt)}</span>
              </div>
            </article>
          ) : null}

          <div className={styles.grid}>
            {gallery.map((item, index) => (
              <article
                key={item.id}
                className={`${styles.photoCard} ${index % 3 === 0 ? styles.photoCardWide : ""}`}
              >
                <img
                  src={getFullMediaUrl(item.mediaUrl)}
                  alt={item.message || `Post de ${item.authorName}`}
                  onError={(e) => {
                    // oculta a imagem ou substitui por um texto/ícone
                    const target = e.target as HTMLImageElement;
                    target.style.display = "none";
                    // Opcionalmente, você pode acrescentar um placeholder ao elemento pai.
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML =
                        '<div class="image-placeholder"><span>Imagem indisponível</span></div>';
                    }
                  }}
                />
                <div className={styles.photoOverlay}>
                  <p>{item.authorName}</p>
                  <span>{item.message}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <GuestBottomNav activeTab="wall" />
    </div>
  );
}

function formatSubmittedAt(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}
