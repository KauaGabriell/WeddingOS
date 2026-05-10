"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminBottomNav } from "../../../components/admin-bottom-nav/admin-bottom-nav";
import { AdminFeedback } from "../../../components/admin-feedback/admin-feedback";
import { MobileTopBar } from "../../../components/mobile-top-bar/mobile-top-bar";
import {
  type AdminGuestRowDto,
  type EventDto,
  adminApi,
  guestApi,
} from "../../../lib/api";
import styles from "./page.module.css";

type ResponseFilter = "all" | "yes" | "pending" | "no";

function getLatestResponseStatus(
  row: AdminGuestRowDto,
): "yes" | "pending" | "no" {
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
    return "Não vai";
  }

  return "Pendente";
}

export default function AdminRsvpsPage() {
  const [rows, setRows] = useState<AdminGuestRowDto[]>([]);
  const [events, setEvents] = useState<EventDto[]>([]);
  const [statusFilter, setStatusFilter] = useState<ResponseFilter>("all");
  const [eventFilter, setEventFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const [rsvpsResponse, eventsResponse] = await Promise.all([
          adminApi.listRsvps({ page: 1, pageSize: 100 }),
          guestApi.listEvents({ page: 1, pageSize: 100 }),
        ]);

        if (active) {
          setRows(rsvpsResponse.items);
          setEvents(eventsResponse.items);
        }
      } catch (error) {
        console.error("Failed to load data:", error);
        if (active) {
          setHasError(true);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      active = false;
    };
  }, []);

  const summary = useMemo(() => {
    const counts = { total: 0, yes: 0, pending: 0, no: 0 };
    for (const row of rows) {
      const status = getLatestResponseStatus(row);
      counts.total += 1;
      counts[status] += 1;

      // Add companions for confirmed responses
      if (status === "yes") {
        const latestResponse = row.responses
          .slice()
          .sort(
            (a, b) =>
              new Date(b.updatedAt ?? b.createdAt).getTime() -
              new Date(a.updatedAt ?? a.createdAt).getTime(),
          )[0];
        if (latestResponse) {
          counts.yes += latestResponse.companionsConfirmed;
        }
      }
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
      <MobileTopBar
        variant="admin"
        brandHref="/admin/dashboard"
        avatarSrc="/admin-dashboard/profile.png"
      />

      <main className={styles.main}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>Visão consolidada</p>
          <h1>Confirmações RSVP</h1>
        </section>

        <section className={styles.summaryGrid}>
          <article>
            <span>Total</span>
            <strong>{summary.total}</strong>
          </article>
          <article>
            <span>Confirmados</span>
            <strong>{summary.yes}</strong>
          </article>
          <article>
            <span>Pendentes</span>
            <strong>{summary.pending}</strong>
          </article>
          <article>
            <span>Não vão</span>
            <strong>{summary.no}</strong>
          </article>
        </section>

        <section className={styles.filters}>
          <div className={styles.filterRow}>
            {[
              { id: "all", label: "Todos" },
              { id: "yes", label: "Confirmados" },
              { id: "pending", label: "Pendentes" },
              { id: "no", label: "Não vão" },
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
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name}
              </option>
            ))}
          </select>
        </section>

        <section className={styles.list}>
          {isLoading ? (
            <AdminFeedback
              variant="loading"
              title="Carregando confirmações"
              body="Estamos consultando os RSVPs por convidado."
            />
          ) : null}
          {hasError ? (
            <AdminFeedback
              variant="error"
              title="Falha ao carregar RSVPs"
              body="Não foi possível consultar as confirmações agora."
              actionHref="/admin/login"
              actionLabel="Reautenticar"
            />
          ) : null}
          {visibleRows.map((row) => {
            const latestStatus = getLatestResponseStatus(row);
            const latestResponse = row.responses
              .slice()
              .sort(
                (a, b) =>
                  new Date(b.updatedAt ?? b.createdAt).getTime() -
                  new Date(a.updatedAt ?? a.createdAt).getTime(),
              )[0];
            const companionsText =
              latestResponse && latestResponse.companionsConfirmed > 0
                ? ` + ${latestResponse.companionsConfirmed} acompanhante${latestResponse.companionsConfirmed > 1 ? "s" : ""}`
                : "";
            return (
              <article className={styles.card} key={row.guest.id}>
                <div className={styles.cardTop}>
                  <h2>
                    {row.guest.fullName}
                    {companionsText}
                  </h2>
                  <span
                    className={`${styles.badge} ${styles[`badge${latestStatus}`]}`}
                  >
                    {getStatusLabel(latestStatus)}
                  </span>
                </div>
                <p>{row.guestGroup.displayName}</p>
                <small>{row.responses.length} resposta(s) registrada(s)</small>
              </article>
            );
          })}
          {!isLoading && !hasError && visibleRows.length === 0 ? (
            <AdminFeedback
              variant="empty"
              title="Nenhum RSVP encontrado"
              body="Ajuste o status ou o evento para visualizar respostas."
            />
          ) : null}
        </section>
      </main>

      <AdminBottomNav />
    </div>
  );
}
