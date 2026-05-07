"use client";

import { useEffect, useMemo, useState } from "react";
import { type AdminGuestListDto, type AdminGuestRowDto, adminApi } from "../../../lib/api";
import styles from "./page.module.css";

type FilterMode = "all" | "confirmed" | "pending" | "declined";
type LoadState = "loading" | "ready" | "error";
type GuestStatus = "confirmed" | "pending" | "declined";

const navItems = [
  { label: "Resumo", href: "/admin/dashboard", icon: "/admin-dashboard/nav-summary.svg" },
  {
    label: "Convidados",
    href: "/admin/guests",
    icon: "/admin-dashboard/nav-guests.svg",
    active: true,
  },
  { label: "Presentes", href: "/admin/gifts", icon: "/admin-dashboard/nav-gifts.svg" },
  { label: "Ajustes", href: "/admin/settings", icon: "/admin-dashboard/nav-settings.svg" },
];

function formatMeta(row: AdminGuestRowDto) {
  if (row.guest.isPrimary) {
    return `${row.guestGroup.allowedCompanions} acompanhante${row.guestGroup.allowedCompanions === 1 ? "" : "s"}`;
  }

  return row.guestGroup.displayName;
}

function getGuestStatus(row: AdminGuestRowDto): GuestStatus {
  const latestResponse = row.responses
    .slice()
    .sort(
      (a, b) =>
        new Date(b.updatedAt ?? b.createdAt).getTime() -
        new Date(a.updatedAt ?? a.createdAt).getTime(),
    )[0];

  if (!latestResponse) {
    return "pending";
  }

  if (latestResponse.responseStatus === "yes") {
    return "confirmed";
  }

  if (latestResponse.responseStatus === "no") {
    return "declined";
  }

  return "pending";
}

function getStatusLabel(status: GuestStatus) {
  if (status === "confirmed") {
    return "Confirmado";
  }

  if (status === "declined") {
    return "Não vão";
  }

  return "Pendente";
}

export default function AdminGuestsPage() {
  const [rows, setRows] = useState<AdminGuestRowDto[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");

  useEffect(() => {
    let isMounted = true;

    async function loadGuests() {
      try {
        const response: AdminGuestListDto = await adminApi.listGuests({
          page: 1,
          pageSize: 100,
          status: "active",
        });

        if (!isMounted) {
          return;
        }

        setRows(response.items);
        setLoadState("ready");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        console.error("Failed to load guests:", error);
        setLoadState("error");
      }
    }

    void loadGuests();

    return () => {
      isMounted = false;
    };
  }, []);

  const visibleRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return rows.filter((row) => {
      const guestStatus = getGuestStatus(row);

      if (filterMode === "confirmed" && guestStatus !== "confirmed") {
        return false;
      }

      if (filterMode === "pending" && guestStatus !== "pending") {
        return false;
      }

      if (filterMode === "declined" && guestStatus !== "declined") {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return (
        row.guest.fullName.toLowerCase().includes(normalizedSearch) ||
        row.guestGroup.displayName.toLowerCase().includes(normalizedSearch) ||
        (row.guest.phone ?? "").includes(normalizedSearch)
      );
    });
  }, [filterMode, rows, search]);

  return (
    <div className={styles.shell}>
      <header className={styles.topBar} aria-label="Navegacao principal administrativa">
        <div className={styles.brandGroup}>
          <button
            className={styles.menuButton}
            type="button"
            aria-label="Abrir menu administrativo"
          >
            <img src="/admin-dashboard/menu.svg" alt="" aria-hidden="true" />
          </button>
          <a className={styles.brand} href="/admin/dashboard">
            Wedding OS
          </a>
        </div>
        <a className={styles.avatarLink} href="/admin/dashboard" aria-label="Perfil administrativo">
          <img src="/admin-dashboard/profile.png" alt="" />
        </a>
      </header>

      <main className={styles.main}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>Lista de Presenca</p>
          <h1>Gerenciar Convidados</h1>
        </section>

        <section className={styles.controlsSection}>
          <label className={styles.searchField} htmlFor="guest-search">
            <span className={styles.searchIcon} aria-hidden="true" />
            <input
              id="guest-search"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nome..."
              type="search"
              value={search}
            />
          </label>

          <div className={styles.filterPanel} aria-label="Filtros de convidados">
            {[
              { id: "all", label: "Todos" },
              { id: "confirmed", label: "Confirmados" },
              { id: "pending", label: "Pendentes" },
              { id: "declined", label: "Não vão" },
            ].map((filter) => (
              <button
                className={`${styles.filterButton} ${
                  filterMode === filter.id ? styles.filterButtonActive : ""
                }`}
                key={filter.id}
                onClick={() => setFilterMode(filter.id as FilterMode)}
                type="button"
              >
                {filter.label}
              </button>
            ))}
          </div>
        </section>

        <section className={styles.listSection} aria-label="Lista de convidados">
          {visibleRows.map((row) => (
            <article className={styles.guestCard} key={row.guest.id}>
              <div className={styles.cardHeader}>
                <div className={styles.cardHeading}>
                  <h2>{row.guest.fullName}</h2>
                  <p>
                    <span className={styles.metaIcon} aria-hidden="true" />
                    {row.guest.phone ?? formatMeta(row)}
                  </p>
                </div>
                <span className={`${styles.badge} ${styles[`badge${getGuestStatus(row)}`]}`}>
                  {getStatusLabel(getGuestStatus(row))}
                </span>
              </div>

              <div className={styles.cardActions}>
                <button className={styles.warmAction} type="button">
                  <span className={styles.actionIcon} aria-hidden="true" />
                  Editar
                </button>
                <button className={styles.outlineAction} type="button">
                  <span className={styles.actionIcon} aria-hidden="true" />
                  Dados
                </button>
                <button
                  className={styles.iconAction}
                  type="button"
                  aria-label="Desativar convidado"
                >
                  <span />
                </button>
              </div>
            </article>
          ))}
        </section>
      </main>

      <button className={styles.fabButton} type="button" aria-label="Adicionar convidado">
        <span className={styles.fabIcon} aria-hidden="true" />
      </button>

      <nav className={styles.bottomNav} aria-label="Navegacao inferior administrativa">
        {navItems.map((item) => (
          <a
            className={`${styles.navItem} ${item.active ? styles.navItemActive : ""}`}
            href={item.href}
            key={item.href}
            aria-current={item.active ? "page" : undefined}
          >
            <img src={item.icon} alt="" aria-hidden="true" />
            <span>{item.label}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}
