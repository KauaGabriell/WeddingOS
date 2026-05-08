"use client";

import { useEffect, useState } from "react";
import { AdminBottomNav } from "../../../components/admin-bottom-nav/admin-bottom-nav";
import { AdminFeedback } from "../../../components/admin-feedback/admin-feedback";
import { MobileTopBar } from "../../../components/mobile-top-bar/mobile-top-bar";
import { type AdminGuestRowDto, ApiRequestError, adminApi } from "../../../lib/api";
import styles from "./page.module.css";

const metricCards = [
  {
    kind: "gifts",
    icon: "/admin-dashboard/gift.svg",
    label: "Total em Presentes",
    value: "R$ 14.250,00",
    trendIcon: "/admin-dashboard/trend.svg",
    trend: "+12% desde ontem",
  },
  {
    kind: "photos",
    icon: "/admin-dashboard/photos.svg",
    label: "Fotos Pendentes",
    value: "24",
    badge: "Moderar",
    note: "Aguardando aprovacao para o mural.",
  },
];

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

const activities = [
  {
    title: "Nova familia cadastrada",
    body: "A familia Vasconcelos concluiu o cadastro aberto.",
    time: "Ha 15 minutos",
    tone: "pink",
  },
  {
    title: "RSVP Confirmado",
    body: "Familia Silveira (4 pessoas) confirmou presenca.",
    time: "Ha 2 horas",
    tone: "warm",
  },
  {
    title: "Foto enviada",
    body: "Uma nova foto do ensaio foi postada.",
    time: "Ontem",
    tone: "muted",
  },
];

export default function AdminDashboardPage() {
  const [guests, setGuests] = useState<AdminGuestRowDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await adminApi.listGuests({ page: 1, pageSize: 100 });
        setGuests(response.items);
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

  const totalGuests = guests.length;
  const confirmedGuests = guests.filter((row) => {
    const latestResponse = row.responses
      .slice()
      .sort(
        (a, b) =>
          new Date(b.updatedAt ?? b.createdAt).getTime() -
          new Date(a.updatedAt ?? a.createdAt).getTime(),
      )[0];
    return latestResponse?.responseStatus === "yes";
  }).length;

  const rsvpPercentage = totalGuests > 0 ? Math.round((confirmedGuests / totalGuests) * 100) : 0;

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
        {!isLoading && !hasError && guests.length === 0 ? (
          <AdminFeedback
            variant="empty"
            title="Sem convidados cadastrados"
            body="Assim que os convidados forem adicionados, o painel mostrara o resumo."
            actionHref="/admin/guests"
            actionLabel="Gerenciar convidados"
          />
        ) : null}

        <section className={styles.quickArea} aria-label="Atalhos e atividades">
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

          <aside className={styles.activityCard} aria-label="Atividades recentes">
            <div className={styles.activityHeader}>
              <h2>Atividades</h2>
              <a href="/admin/audit-logs">Ver tudo</a>
            </div>
            <div className={styles.activityList}>
              {activities.map((activity) => (
                <article className={styles.activityItem} key={activity.title}>
                  <span className={`${styles.activityDot} ${styles[activity.tone]}`} />
                  <div>
                    <h3>{activity.title}</h3>
                    <p>{activity.body}</p>
                    <time>{activity.time}</time>
                  </div>
                </article>
              ))}
            </div>
          </aside>
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
