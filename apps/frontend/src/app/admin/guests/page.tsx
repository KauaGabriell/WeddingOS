"use client";

import { useEffect, useMemo, useState } from "react";
import { type AdminGuestListDto, type AdminGuestRowDto, adminApi } from "../../../lib/api";
import styles from "./page.module.css";

type FilterMode = "all" | "active" | "primary" | "companions";
type LoadState = "loading" | "ready" | "error";

const fallbackRows: AdminGuestRowDto[] = [
  {
    guestGroup: {
      id: "group-1",
      displayName: "Familia Vasconcelos",
      groupCode: "VASCONC1",
      allowedCompanions: 2,
      primaryContactName: "Beatriz Vasconcelos",
      primaryContactPhone: "62999991111",
      primaryContactEmail: null,
      notes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    guest: {
      id: "guest-1",
      guestGroupId: "group-1",
      fullName: "Beatriz Vasconcelos",
      phone: "62999991111",
      email: null,
      isPrimary: true,
      status: "active",
      lastAccessAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    eligibility: [],
    responses: [],
  },
  {
    guestGroup: {
      id: "group-2",
      displayName: "Familia Albuquerque",
      groupCode: "ALBUQUQ2",
      allowedCompanions: 1,
      primaryContactName: "Lucas Albuquerque",
      primaryContactPhone: "62988882222",
      primaryContactEmail: null,
      notes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    guest: {
      id: "guest-2",
      guestGroupId: "group-2",
      fullName: "Lucas Albuquerque",
      phone: "62988882222",
      email: null,
      isPrimary: true,
      status: "active",
      lastAccessAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    eligibility: [],
    responses: [],
  },
  {
    guestGroup: {
      id: "group-2",
      displayName: "Familia Albuquerque",
      groupCode: "ALBUQUQ2",
      allowedCompanions: 1,
      primaryContactName: "Lucas Albuquerque",
      primaryContactPhone: "62988882222",
      primaryContactEmail: null,
      notes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    guest: {
      id: "guest-3",
      guestGroupId: "group-2",
      fullName: "Amanda Albuquerque",
      phone: null,
      email: null,
      isPrimary: false,
      status: "active",
      lastAccessAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    eligibility: [],
    responses: [],
  },
];

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

export default function AdminGuestsPage() {
  const [rows, setRows] = useState<AdminGuestRowDto[]>(fallbackRows);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");

  useEffect(() => {
    let isMounted = true;

    async function loadGuests() {
      try {
        const response: AdminGuestListDto = await adminApi.listGuests({
          page: 1,
          pageSize: 30,
          status: "active",
        });

        if (!isMounted) {
          return;
        }

        setRows(response.items);
        setLoadState("ready");
      } catch {
        if (!isMounted) {
          return;
        }

        setRows(fallbackRows);
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
      if (filterMode === "primary" && !row.guest.isPrimary) {
        return false;
      }

      if (filterMode === "companions" && row.guest.isPrimary) {
        return false;
      }

      if (filterMode === "active" && row.guest.status !== "active") {
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
              { id: "active", label: "Ativos" },
              { id: "primary", label: "Principais" },
              { id: "companions", label: "Acompanhantes" },
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
                  <p>{row.guest.phone ?? formatMeta(row)}</p>
                </div>
                <span className={styles.badge}>
                  {row.guest.isPrimary ? "Convidado Principal" : "Acompanhante"}
                </span>
              </div>

              <div className={styles.cardActions}>
                <button className={styles.warmAction} type="button">
                  Editar
                </button>
                <button className={styles.outlineAction} type="button">
                  Ver grupo
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

        {loadState === "error" ? (
          <p className={styles.modeNotice}>
            Modo visual ativo. Entre como admin para carregar os convidados reais da API.
          </p>
        ) : null}
      </main>

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
