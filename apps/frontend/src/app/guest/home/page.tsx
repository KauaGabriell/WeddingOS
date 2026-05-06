import styles from "./page.module.css";

const navItems = [
  { label: "Início", href: "/guest/home", icon: "/guest-home/nav-home.svg", active: true },
  { label: "RSVP", href: "/rsvp", icon: "/guest-home/nav-rsvp.svg" },
  { label: "Presentes", href: "/gifts", icon: "/guest-home/nav-gifts.svg" },
  { label: "Mural", href: "/photo-wall", icon: "/guest-home/nav-wall.svg" },
];

const countdown = [
  { value: "42", label: "Dias" },
  { value: "12", label: "Horas" },
  { value: "08", label: "Min" },
];

export default function GuestHomePage() {
  return (
    <div className={styles.shell}>
      <header className={styles.topBar} aria-label="Navegacao principal do convidado">
        <div className={styles.brandGroup}>
          <button className={styles.menuButton} type="button" aria-label="Abrir menu">
            <img src="/guest-home/menu-icon.svg" alt="" aria-hidden="true" />
          </button>
          <span className={styles.brand}>Wedding OS</span>
        </div>
        <a className={styles.avatarLink} href="/guest/home" aria-label="Perfil do convidado">
          <img src="/guest-home/profile-avatar.jpg" alt="" />
        </a>
      </header>

      <main className={styles.main}>
        <section className={styles.hero} aria-labelledby="guest-home-title">
          <h1 id="guest-home-title" aria-label="Bem-vindo, Igor & Amanda">
            <span>Bem-vindo,</span>
            <strong>Igor &amp; Amanda</strong>
          </h1>
          <p>A contagem regressiva para o sim começou</p>
        </section>

        <section className={styles.bento} aria-label="Resumo do convite">
          <article className={`${styles.card} ${styles.countdownCard}`}>
            <div>
              <p className={styles.eyebrow}>Faltam apenas</p>
              <div className={styles.countdownGrid} aria-label="42 dias, 12 horas e 8 minutos">
                {countdown.map((item, index) => (
                  <div className={styles.countdownUnit} key={item.label}>
                    {index > 0 ? <span className={styles.separator}>:</span> : null}
                    <strong>{item.value}</strong>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.dateRow}>
              <img src="/guest-home/date-icon.svg" alt="" aria-hidden="true" />
              <p>15 de Setembro, 2024 • Villa di Lucca</p>
            </div>
          </article>

          <article className={`${styles.card} ${styles.rsvpCard}`}>
            <div className={styles.rsvpContent}>
              <div className={styles.iconBubble}>
                <img src="/guest-home/rsvp-icon.svg" alt="" aria-hidden="true" />
              </div>
              <h2>RSVP Status</h2>
              <p>Sua presença é o nosso maior presente. Por favor, confirme até 15 de Agosto.</p>
              <div className={styles.statusPill}>
                <span />
                Confirmação pendente
              </div>
            </div>
            <a className={styles.primaryCta} href="/rsvp">
              Confirmar presença
            </a>
          </article>

          <FeatureCard
            eyebrow="Lista de desejos"
            title="Presentes"
            body="Contribua para nossa jornada com presentes selecionados para nossa nova casa."
            href="/gifts"
            action="Ver lista"
            image="/guest-home/presents-card.png"
            icon="/guest-home/gift-arrow.svg"
          />

          <FeatureCard
            eyebrow="Memórias coletivas"
            title="Mural"
            body="Compartilhe fotos e mensagens especiais com os noivos e outros convidados."
            href="/photo-wall"
            action="Explorar mural"
            image="/guest-home/mural-card.png"
            icon="/guest-home/mural-arrow.svg"
          />
        </section>

        <section className={styles.quoteSection} aria-label="Citacao">
          <img src="/guest-home/quote-icon.svg" alt="" aria-hidden="true" />
          <blockquote>"O amor não se vê com os olhos, mas com o coração."</blockquote>
          <cite>Shakespeare</cite>
        </section>
      </main>

      <nav className={styles.bottomNav} aria-label="Navegacao inferior do convidado">
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

type FeatureCardProps = {
  action: string;
  body: string;
  eyebrow: string;
  href: string;
  icon: string;
  image: string;
  title: string;
};

function FeatureCard({ action, body, eyebrow, href, icon, image, title }: FeatureCardProps) {
  return (
    <article className={styles.featureCard}>
      <img className={styles.featureImage} src={image} alt="" aria-hidden="true" />
      <div className={styles.featureGradient} />
      <div className={styles.featureContent}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h2>{title}</h2>
        <p>{body}</p>
        <a href={href}>
          {action}
          <img src={icon} alt="" aria-hidden="true" />
        </a>
      </div>
    </article>
  );
}
