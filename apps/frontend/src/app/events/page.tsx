"use client";

import { useEffect, useMemo, useState } from "react";
import { type EventDto, guestApi } from "../../lib/api";
import {
  fallbackEvents,
  formatEventDay,
  formatEventMonth,
  formatEventTime,
  formatEventWeekday,
  formatFullDate,
  formatLocation,
  formatLocationMeta,
  getEventMapUrl,
  getEventTypeLabel,
  sortEventsByStart,
} from "../../lib/guest-events";
import styles from "./page.module.css";

const navItems = [
  { label: "Inicio", href: "/guest/home", icon: "/guest-home/nav-home.svg" },
  { label: "RSVP", href: "/rsvp", icon: "/guest-home/nav-rsvp.svg" },
  { label: "Presentes", href: "/gifts", icon: "/guest-home/nav-gifts.svg" },
  { label: "Mural", href: "/photo-wall", icon: "/guest-home/nav-wall.svg" },
];

type LoadState = "loading" | "ready" | "error";
const skeletonKeys = ["skeleton-1", "skeleton-2"] as const;

export default function GuestEventsPage() {
  const [events, setEvents] = useState<EventDto[]>(fallbackEvents);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  useEffect(() => {
    let isMounted = true;

    async function loadEvents() {
      try {
        const response = await guestApi.listEvents({ page: 1, pageSize: 10 });

        if (!isMounted) {
          return;
        }

        setEvents(response.items.length > 0 ? response.items : fallbackEvents);
        setLoadState("ready");
      } catch {
        if (!isMounted) {
          return;
        }

        setEvents(fallbackEvents);
        setLoadState("error");
      }
    }

    loadEvents();

    return () => {
      isMounted = false;
    };
  }, []);

  const sortedEvents = useMemo(() => sortEventsByStart(events), [events]);

  return (
    <div className={styles.shell}>
      <header className={styles.topBar} aria-label="Navegacao principal do convidado">
        <div className={styles.brandGroup}>
          <button className={styles.menuButton} type="button" aria-label="Abrir menu">
            <img src="/guest-home/menu-icon.svg" alt="" aria-hidden="true" />
          </button>
          <a className={styles.brand} href="/guest/home">
            Wedding OS
          </a>
        </div>
        <a className={styles.avatarLink} href="/guest/home" aria-label="Perfil do convidado">
          <img src="/guest-home/profile-avatar.jpg" alt="" />
        </a>
      </header>

      <main className={styles.main}>
        <section className={styles.hero} aria-labelledby="events-title">
          <div className={styles.statusBadge} data-state={loadState}>
            <span />
            {loadState === "loading"
              ? "Atualizando agenda"
              : loadState === "ready"
                ? "Agenda conectada"
                : "Modo visual"}
          </div>
          <p className={styles.eyebrow}>Eventos do convite</p>
          <h1 id="events-title">Acompanhe cada encontro antes do grande dia.</h1>
          <p className={styles.heroBody}>
            Os horarios e locais ficam centralizados aqui. Quando houver endereco confirmado, o mapa
            abre em um toque.
          </p>
        </section>

        {loadState === "error" ? (
          <section className={styles.noticeCard} aria-label="Aviso de conexao">
            <strong>Agenda exibida em modo visual</strong>
            <p>
              A tela carregou os dados mockados porque a sessao do convidado ou a API ainda nao
              responderam. Assim que a autenticacao estiver valida, os eventos reais aparecem aqui.
            </p>
            <a href="/guest/login/code">Entrar com codigo</a>
          </section>
        ) : null}

        <section className={styles.timeline} aria-label="Agenda de eventos">
          {loadState === "loading"
            ? skeletonKeys.map((key) => <EventCardSkeleton key={key} />)
            : sortedEvents.map((event, index) => (
                <EventCard event={event} index={index} key={event.id} />
              ))}
        </section>
      </main>

      <nav className={styles.bottomNav} aria-label="Navegacao inferior do convidado">
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

type EventCardProps = {
  event: EventDto;
  index: number;
};

function EventCard({ event, index }: EventCardProps) {
  const mapUrl = getEventMapUrl(event);
  const themeClass = event.eventType === "wedding" ? styles.weddingCard : styles.showerCard;
  const badgeLabel = index === 0 ? "Mais proximo" : "Na sequencia";

  return (
    <article className={`${styles.eventCard} ${themeClass}`}>
      <div className={styles.eventGlow} aria-hidden="true" />
      <div className={styles.eventHeader}>
        <div>
          <p className={styles.eventEyebrow}>{getEventTypeLabel(event.eventType)}</p>
          <h2>{event.name}</h2>
        </div>
        <span className={styles.sequencePill}>{badgeLabel}</span>
      </div>

      <div className={styles.datePanel}>
        <div className={styles.dateBlock}>
          <strong>{formatEventDay(event.startsAt)}</strong>
          <span>{formatEventMonth(event.startsAt)}</span>
        </div>
        <div className={styles.dateCopy}>
          <p>{formatEventWeekday(event.startsAt)}</p>
          <strong>{formatFullDate(event.startsAt)}</strong>
          <span>{formatEventTime(event.startsAt)}</span>
        </div>
      </div>

      <div className={styles.infoGrid}>
        <InfoItem
          icon="/guest-home/date-icon.svg"
          label="Horario"
          value={`${formatEventTime(event.startsAt)}h`}
        />
        <InfoItem
          icon="/guest-home/rsvp-icon.svg"
          label="Local"
          value={formatLocation(event)}
          detail={formatLocationMeta(event)}
        />
      </div>

      {event.notes ? <p className={styles.notes}>{event.notes}</p> : null}

      <div className={styles.actionRow}>
        <a className={styles.secondaryAction} href="/guest/home">
          Voltar ao inicio
        </a>
        {mapUrl ? (
          <a
            className={styles.primaryAction}
            href={mapUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={`Abrir mapa para ${event.name}`}
          >
            Abrir mapa
          </a>
        ) : (
          <span className={styles.disabledAction}>Mapa em confirmacao</span>
        )}
      </div>
    </article>
  );
}

type InfoItemProps = {
  detail?: string;
  icon: string;
  label: string;
  value: string;
};

function InfoItem({ detail, icon, label, value }: InfoItemProps) {
  return (
    <div className={styles.infoItem}>
      <span className={styles.infoIcon}>
        <img src={icon} alt="" aria-hidden="true" />
      </span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        {detail ? <span>{detail}</span> : null}
      </div>
    </div>
  );
}

function EventCardSkeleton() {
  return <article className={`${styles.eventCard} ${styles.skeletonCard}`} aria-hidden="true" />;
}
