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
    note: "Aguardando sua aprovação para o mural.",
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
    href: "/admin/photo-wall",
    icon: "/admin-dashboard/moderation.svg",
    title: "Moderar Mural",
    subtitle: "Aprovar fotos e mensagens",
    tone: "pink",
  },
  {
    href: "/admin/settings",
    icon: "/admin-dashboard/settings.svg",
    title: "Configurações",
    subtitle: "Perfil e preferências do site",
    tone: "neutral",
  },
];

const activities = [
  {
    title: "Novo presente recebido!",
    body: 'Mariana e Jorge enviaram "Jogo de Jantar".',
    time: "Há 15 minutos",
    tone: "pink",
  },
  {
    title: "RSVP Confirmado",
    body: "Família Silveira (4 pessoas) confirmou presença.",
    time: "Há 2 horas",
    tone: "warm",
  },
  {
    title: "Foto enviada",
    body: "Uma nova foto do ensaio foi postada.",
    time: "Ontem",
    tone: "muted",
  },
];

const navItems = [
  {
    label: "Resumo",
    href: "/admin/dashboard",
    icon: "/admin-dashboard/nav-summary.svg",
    active: true,
  },
  { label: "Convidados", href: "/admin/guests", icon: "/admin-dashboard/nav-guests.svg" },
  { label: "Presentes", href: "/admin/gifts", icon: "/admin-dashboard/nav-gifts.svg" },
  { label: "Ajustes", href: "/admin/settings", icon: "/admin-dashboard/nav-settings.svg" },
];

export default function AdminDashboardPage() {
  return (
    <div className={styles.shell}>
      <header className={styles.topBar} aria-label="Navegação principal administrativa">
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
        <section className={styles.welcome} aria-labelledby="admin-dashboard-title">
          <div>
            <h1 id="admin-dashboard-title">Olá, Alice &amp; Bruno</h1>
            <p>Seu grande dia está a 124 dias de distância.</p>
          </div>
          <a className={styles.inviteButton} href="/admin/invites">
            <img src="/admin-dashboard/send-invites.svg" alt="" aria-hidden="true" />
            <span>Enviar Convites Digitais</span>
          </a>
        </section>

        <section className={styles.metricsGrid} aria-label="Métricas administrativas">
          <article className={styles.rsvpCard}>
            <div className={styles.rsvpHeader}>
              <p>Status da Lista</p>
              <h2>Confirmações RSVP</h2>
              <span>82 convidados confirmados de um total de 120.</span>
            </div>
            <div className={styles.rsvpChart} aria-label="68% dos convidados confirmaram RSVP">
              <img src="/admin-dashboard/rsvp-ring.svg" alt="" aria-hidden="true" />
              <div className={styles.rsvpChartText}>
                <strong>68%</strong>
                <span>RSVP</span>
              </div>
            </div>
          </article>

          {metricCards.map((card) => (
            <MetricCard key={card.kind} {...card} />
          ))}
        </section>

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

            <a className={styles.editButton} href="/admin/settings">
              <img src="/admin-dashboard/edit.svg" alt="" aria-hidden="true" />
              <span>Editar Cerimonial</span>
            </a>
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

      <nav className={styles.bottomNav} aria-label="Navegação inferior administrativa">
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
