"use client";

import { useEffect, useMemo, useState } from "react";
import { GuestBottomNav } from "../../components/guest-bottom-nav/guest-bottom-nav";
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

export default function PhotoWallPage() {
  const [items, setItems] = useState<PhotoGalleryItemDto[]>(fallbackItems);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  useEffect(() => {
    let isMounted = true;

    async function loadPhotoWall() {
      try {
        const response = await guestApi.listPhotoWall({ page: 1, pageSize: 30 });

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
      <header className={styles.topBar} aria-label="Navegacao principal do convidado">
        <div className={styles.brandGroup}>
          <button className={styles.avatarButton} type="button" aria-label="Perfil">
            <img src="/guest-home/profile-avatar.jpg" alt="" aria-hidden="true" />
          </button>
          <a className={styles.brand} href="/guest/home">
            Wedding OS
          </a>
        </div>
        <span className={styles.menuDots} aria-hidden="true" />
      </header>

      <main className={styles.main}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>Mural de Fotos</p>
          <h1>Mural de Fotos</h1>
          <p>
            Capture e compartilhe os momentos magicos da nossa celebracao. Suas memorias tornam
            nossa historia ainda mais completa.
          </p>
        </section>

        <section className={styles.actions}>
          <button type="button" className={styles.uploadButton} disabled>
            <img src="/guest-home/nav-wall.svg" alt="" aria-hidden="true" />
            <span>Enviar Foto</span>
          </button>
        </section>

        {loadState === "error" ? (
          <section className={styles.noticeCard}>
            <strong>Modo visual ativo</strong>
            <p>Conecte sua sessao para carregar as fotos reais do mural.</p>
            <a href="/guest/login/code">Entrar com codigo</a>
          </section>
        ) : null}

        <section className={styles.gallery}>
          {featured ? (
            <article className={styles.featuredPost}>
              <img src={featured.mediaUrl} alt={featured.message} />
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
                <img src={item.mediaUrl} alt={item.message} />
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
