"use client";

import { useEffect, useMemo, useState } from "react";
import { type AdminGuestRowDto, adminApi } from "../../../lib/api";
import styles from "./page.module.css";

type ResponseFilter = "all" | "yes" | "pending" | "no";

const navItems = [
  { label: "Resumo", href: "/admin/dashboard", icon: "/admin-dashboard/nav-summary.svg" },
  { label: "Convidados", href: "/admin/guests", icon: "/admin-dashboard/nav-guests.svg" },
  { label: "Presentes", href: "/admin/gifts", icon: "/admin-dashboard/nav-gifts.svg" },
  { label: "Ajustes", href: "/admin/settings", icon: "/admin-dashboard/nav-settings.svg" },
];

function getLatestResponseStatus(row: AdminGuestRowDto): "yes" | "pending" | "no" {
  const latestResponse = row.responses
    .slice()
    .sort(
      (a, b) =>
        new Date(b.updatedAt ?? b.createdAt).getTime() -
        new Date(a.updatedAt ?? a.createdAt).getTime(),
    )[0];

  if (!latestResponse || latestResponse.responseStatus === "pending") {
    return "pending";
  }

  return latestResponse.responseStatus === "yes" ? "yes" : "no";
}

function getStatusLabel(status: "yes" | "pending" | "no") {
  if (status === "yes") {
    return "Confirmado";
  }

  if (status === "no") {
    return "Nao vai";
  }

  return "Pendente";
}

export default function AdminRsvpsPage() {
  const [rows, setRows] = useState<AdminGuestRowDto[]>([]);
  const [statusFilter, setStatusFilter] = useState<ResponseFilter>("all");
  const [eventFilter, setEventFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadRows() {
      try {
        const response = await adminApi.listRsvps({ page: 1, pageSize: 100 });
        if (active) {
          setRows(response.items);
        }
      } catch (error) {
        console.error("Failed to load RSVPs:", error);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadRows();

    return () => {
      active = false;
    };
  }, []);

  const eventIds = useMemo(() => {
    const ids = new Set<string>();
    for (const row of rows) {
      for (const response of row.responses) {
        ids.add(response.eventId);
      }
    }
    return Array.from(ids);
  }, [rows]);

  const summary = useMemo(() => {
    const counts = { yes: 0, pending: 0, no: 0 };
    for (const row of rows) {
      const status = getLatestResponseStatus(row);
      counts[status] += 1;
    }
    return counts;
  }, [rows]);

  const visibleRows = useMemo(() => {
    return rows.filter((row) => {
      const latestStatus = getLatestResponseStatus(row);
      if (statusFilter !== "all" && latestStatus !== statusFilter) {
        return false;
      }

      if (eventFilter === "all") {
        return true;
      }

      return row.responses.some((response) => response.eventId === eventFilter);
    });
  }, [eventFilter, rows, statusFilter]);

  return (
    <div className={styles.shell}>
      <header className={styles.topBar}>
        <a className={styles.brand} href="/admin/dashboard">
          Wedding OS
        </a>
        <a className={styles.actionLink} href="/admin/guests">
          Convidados
        </a>
      </header>

      <main className={styles.main}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>Visao consolidada</p>
          <h1>Confirmacoes RSVP</h1>
        </section>

        <section className={styles.summaryGrid}>
          <article>
            <span>Confirmados</span>
            <strong>{summary.yes}</strong>
          </article>
          <article>
            <span>Pendentes</span>
            <strong>{summary.pending}</strong>
          </article>
          <article>
            <span>Nao vao</span>
            <strong>{summary.no}</strong>
          </article>
        </section>

        <section className={styles.filters}>
          <div className={styles.filterRow}>
            {[
              { id: "all", label: "Todos" },
              { id: "yes", label: "Confirmados" },
              { id: "pending", label: "Pendentes" },
              { id: "no", label: "Nao vao" },
            ].map((item) => (
              <button
                className={`${styles.filterButton} ${
                  statusFilter === item.id ? styles.filterButtonActive : ""
                }`}
                key={item.id}
                onClick={() => setStatusFilter(item.id as ResponseFilter)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>

          <select
            className={styles.eventSelect}
            onChange={(event) => setEventFilter(event.target.value)}
            value={eventFilter}
          >
            <option value="all">Todos os eventos</option>
            {eventIds.map((eventId, index) => (
              <option key={eventId} value={eventId}>
                Evento {index + 1}
              </option>
            ))}
          </select>
        </section>

        <section className={styles.list}>
          {visibleRows.map((row) => {
            const latestStatus = getLatestResponseStatus(row);
            return (
              <article className={styles.card} key={row.guest.id}>
                <div className={styles.cardTop}>
                  <h2>{row.guest.fullName}</h2>
                  <span className={`${styles.badge} ${styles[`badge${latestStatus}`]}`}>
                    {getStatusLabel(latestStatus)}
                  </span>
                </div>
                <p>{row.guestGroup.displayName}</p>
                <small>{row.responses.length} resposta(s) registrada(s)</small>
              </article>
            );
          })}
          {!isLoading && visibleRows.length === 0 ? (
            <p className={styles.emptyState}>Nenhum RSVP encontrado para este filtro.</p>
          ) : null}
        </section>
      </main>

      <nav className={styles.bottomNav}>
        {navItems.map((item) => (
          <a className={styles.navItem} href={item.href} key={item.href}>
            <img src={item.icon} alt="" aria-hidden="true" />
            <span>{item.label}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}
