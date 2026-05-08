"use client";

import { useEffect, useState } from "react";
import { AdminBottomNav } from "../../../components/admin-bottom-nav/admin-bottom-nav";
import { AdminFeedback } from "../../../components/admin-feedback/admin-feedback";
import { MobileTopBar } from "../../../components/mobile-top-bar/mobile-top-bar";
import { type AdminDashboardSummaryDto, ApiRequestError, adminApi } from "../../../lib/api";
import styles from "./page.module.css";

function createMetricCards(summary: AdminDashboardSummaryDto | null, isLoading: boolean) {
  return [
    {
      kind: "gifts",
      icon: "/admin-dashboard/gift.svg",
      label: "Total de Presentes",
      value: isLoading || !summary ? "--" : String(summary.totalGifts),
      trendIcon: "/admin-dashboard/trend.svg",
      trend: isLoading || !summary ? "Sincronizando" : `${summary.reservedGifts} reservados`,
    },
    {
      kind: "photos",
      icon: "/admin-dashboard/photos.svg",
      label: "Fotos Pendentes",
      value: isLoading || !summary ? "--" : String(summary.pendingPhotos),
      badge: "Moderar",
      note: "Aguardando aprovacao para o mural.",
    },
  ];
}

const shortcuts = [
  {
    href: "/admin/guests",
    icon: "/admin-dashboard/guests.svg",
    title: "Gerenciar Convidados",
    subtitle: "Acessar lista e categorias",
    tone: "warm",
  },
  {
    href: "/admin/rsvps",
    icon: "/admin-dashboard/moderation.svg",
    title: "Visao de RSVP",
    subtitle: "Consolidado por evento e status",
    tone: "pink",
  },
];

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<AdminDashboardSummaryDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await adminApi.getDashboard();
        setSummary(response);
        setHasError(false);
      } catch (error) {
        console.error("Failed to fetch dashboard stats:", error);
        setHasError(true);
        if (error instanceof ApiRequestError && error.status === 401) {
          console.warn("User is not authorized as admin. Please login first.");
        }
      } finally {
        setIsLoading(false);
      }
    }
    void fetchStats();
  }, []);

  const totalGuests = summary?.totalGuests ?? 0;
  const confirmedGuests = summary?.confirmedGuests ?? 0;
  const rsvpPercentage = totalGuests > 0 ? Math.round((confirmedGuests / totalGuests) * 100) : 0;
  const metricCards = createMetricCards(summary, isLoading);

  return (
    <div className={styles.shell}>
      <MobileTopBar
        variant="admin"
        brandHref="/admin/dashboard"
        avatarSrc="/admin-dashboard/profile.png"
      />

      <main className={styles.main}>
        <section className={styles.welcome} aria-labelledby="admin-dashboard-title">
          <div>
            <h1 id="admin-dashboard-title">Ola, Ygor &amp; Amanda</h1>
            <p>Seu grande dia esta a 124 dias de distancia.</p>
          </div>
        </section>

        <section className={styles.metricsGrid} aria-label="Metricas administrativas">
          <article className={styles.rsvpCard}>
            <div className={styles.rsvpHeader}>
              <p>Status da Lista</p>
              <h2>Confirmacoes RSVP</h2>
              {isLoading ? (
                <span>Carregando dados...</span>
              ) : (
                <span>
                  {confirmedGuests} convidados confirmados de um total de {totalGuests}.
                </span>
              )}
            </div>
            <div
              className={styles.rsvpChart}
              aria-label={`${rsvpPercentage}% dos convidados confirmaram RSVP`}
            >
              <img src="/admin-dashboard/rsvp-ring.svg" alt="" aria-hidden="true" />
              <div className={styles.rsvpChartText}>
                <strong>{isLoading ? "--" : `${rsvpPercentage}%`}</strong>
                <span>RSVP</span>
              </div>
            </div>
          </article>

          {metricCards.map((card) => (
            <MetricCard key={card.kind} {...card} />
          ))}
        </section>

        {isLoading ? (
          <AdminFeedback
            variant="loading"
            title="Sincronizando painel"
            body="Estamos carregando os indicadores administrativos."
          />
        ) : null}
        {hasError ? (
          <AdminFeedback
            variant="error"
            title="Falha ao carregar indicadores"
            body="Nao foi possivel carregar os dados em tempo real do painel."
            actionHref="/admin/login"
            actionLabel="Reautenticar"
          />
        ) : null}
        {!isLoading && !hasError && totalGuests === 0 ? (
          <AdminFeedback
            variant="empty"
            title="Sem convidados cadastrados"
            body="Assim que os convidados forem adicionados, o painel mostrara o resumo."
            actionHref="/admin/guests"
            actionLabel="Gerenciar convidados"
          />
        ) : null}

        <section className={styles.quickArea} aria-label="Atalhos administrativos">
          <div className={styles.shortcuts}>
            {shortcuts.map((shortcut) => (
              <a className={styles.shortcutCard} href={shortcut.href} key={shortcut.href}>
                <span className={`${styles.shortcutIcon} ${styles[shortcut.tone]}`}>
                  <img src={shortcut.icon} alt="" aria-hidden="true" />
                </span>
                <span className={styles.shortcutText}>
                  <strong>{shortcut.title}</strong>
                  <span>{shortcut.subtitle}</span>
                </span>
              </a>
            ))}
          </div>
        </section>
      </main>

      <a
        className={styles.floatingAction}
        href="/admin/photo-wall"
        aria-label="Abrir mural administrativo"
      >
        <img src="/admin-dashboard/chat.svg" alt="" aria-hidden="true" />
        <span className={styles.visuallyHidden}>Abrir mural administrativo</span>
      </a>

      <AdminBottomNav />
    </div>
  );
}

type MetricCardProps = {
  badge?: string;
  icon: string;
  kind: string;
  label: string;
  note?: string;
  trend?: string;
  trendIcon?: string;
  value: string;
};

function MetricCard({ badge, icon, kind, label, note, trend, trendIcon, value }: MetricCardProps) {
  return (
    <article className={`${styles.metricCard} ${kind === "photos" ? styles.photoMetric : ""}`}>
      <div className={styles.metricTop}>
        <span className={styles.metricIcon}>
          <img src={icon} alt="" aria-hidden="true" />
        </span>
        {badge ? <span className={styles.metricBadge}>{badge}</span> : null}
      </div>
      <div className={styles.metricBody}>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
      {trend && trendIcon ? (
        <div className={styles.metricTrend}>
          <img src={trendIcon} alt="" aria-hidden="true" />
          <span>{trend}</span>
        </div>
      ) : null}
      {note ? <p className={styles.metricNote}>{note}</p> : null}
    </article>
  );
}
