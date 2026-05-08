"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ADMIN_SESSION_TOKEN_STORAGE_KEY, ADMIN_USER_ID_STORAGE_KEY, authApi } from "../../lib/api";
import styles from "./mobile-top-bar.module.css";

type MobileTopBarVariant = "guest" | "admin";

type MobileTopBarProps = {
  avatarSrc: string;
  brandHref: string;
  variant: MobileTopBarVariant;
};

export function MobileTopBar({ avatarSrc, brandHref, variant }: MobileTopBarProps) {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);
    try {
      if (variant === "guest") {
        try {
          await authApi.logoutGuest();
        } finally {
          router.replace("/guest/login");
        }
        return;
      }

      if (typeof window !== "undefined") {
        window.localStorage.removeItem(ADMIN_SESSION_TOKEN_STORAGE_KEY);
        window.localStorage.removeItem(ADMIN_USER_ID_STORAGE_KEY);
      }
      router.replace("/admin/login");
    } finally {
      setIsLoggingOut(false);
      setIsMenuOpen(false);
    }
  }

  return (
    <>
      <header className={styles.topBar} aria-label="Navegacao principal">
        <div className={styles.brandGroup}>
          <button
            className={styles.menuButton}
            type="button"
            aria-label="Abrir menu"
            onClick={() => setIsMenuOpen(true)}
          >
            <img src="/guest-home/menu-icon.svg" alt="" aria-hidden="true" />
          </button>
          <Link className={styles.brand} href={brandHref}>
            Wedding OS
          </Link>
        </div>
        <Link className={styles.avatarLink} href={brandHref} aria-label="Abrir perfil">
          <img src={avatarSrc} alt="" />
        </Link>
      </header>

      {isMenuOpen ? (
        <>
          <button
            className={styles.menuPanelBackdrop}
            type="button"
            aria-label="Fechar menu"
            onClick={() => setIsMenuOpen(false)}
          />
          <div className={styles.menuPanel}>
            <button
              className={styles.menuAction}
              type="button"
              onClick={() => void handleLogout()}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? "Saindo..." : "Sair"}
            </button>
          </div>
        </>
      ) : null}
    </>
  );
}
