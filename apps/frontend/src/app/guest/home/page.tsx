"use client";

import { useEffect, useMemo, useState } from "react";
import { GuestBottomNav } from "../../../components/guest-bottom-nav/guest-bottom-nav";
import { PublicFeedback } from "../../../components/public-feedback/public-feedback";
import {
  type EventDto,
  GUEST_ACCESS_CODE_STORAGE_KEY,
  type GuestHomeDto,
  type RsvpResponseDto,
  guestApi,
} from "../../../lib/api";
import {
  fallbackEvents,
  formatEventDay,
  formatEventMonth,
  formatEventTime,
  formatFullDate,
  formatLocation,
  getEventTypeLabel,
  sortEventsByStart,
} from "../../../lib/guest-events";
import styles from "./page.module.css";

type LoadState = "loading" | "ready" | "error";

export default function GuestHomePage() {
  const [home, setHome] = useState<GuestHomeDto | null>(null);
  const [events, setEvents] = useState<EventDto[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [storedAccessCode, setStoredAccessCode] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadGuestHome() {
      try {
        const [homeResponse, eventsResponse] = await Promise.allSettled([
          guestApi.getHome(),
          guestApi.listEvents(),
        ]);

        if (homeResponse.status === "rejected") {
          throw homeResponse.reason;
        }

        const eventItems =
          eventsResponse.status === "fulfilled"
            ? eventsResponse.value.items
            : homeResponse.value.events;

        if (!isMounted) {
          return;
        }

        setHome(homeResponse.value);
        if (homeResponse.value.accessCode) {
          window.localStorage.setItem(GUEST_ACCESS_CODE_STORAGE_KEY, homeResponse.value.accessCode);
          setStoredAccessCode(homeResponse.value.accessCode);
        } else {
          setStoredAccessCode(window.localStorage.getItem(GUEST_ACCESS_CODE_STORAGE_KEY));
        }
        setEvents(eventItems.length > 0 ? eventItems : fallbackEvents);
        setLoadState("ready");
      } catch {
        if (!isMounted) {
          return;
        }

        setStoredAccessCode(window.localStorage.getItem(GUEST_ACCESS_CODE_STORAGE_KEY));
        setEvents(fallbackEvents);
        setLoadState("error");
      }
    }

    loadGuestHome();

    return () => {
      isMounted = false;
    };
  }, []);

  const primaryGuest = home?.guests.find((guest) => guest.isPrimary) ?? home?.guests[0] ?? null;
  const weddingEvent =
    events.find((event) => event.eventType === "wedding") ?? events[events.length - 1];
  const nextEvents = useMemo(() => sortEventsByStart(events).slice(0, 2), [events]);
  const countdown = useMemo(() => buildCountdown(weddingEvent?.startsAt), [weddingEvent?.startsAt]);
  const responses = home?.responses ?? [];
  const rsvpSummary = buildRsvpSummary(nextEvents, responses);
  const heroName = home?.guestGroup.displayName ?? primaryGuest?.fullName ?? "Igor & Amanda";
  const invitationStatus = loadState === "ready" ? "Convite conectado" : "Modo visual";
  const accessCode = home?.accessCode ?? storedAccessCode;

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
          <div className={styles.syncBadge} data-state={loadState}>
            <span />
            {loadState === "loading" ? "Sincronizando convite" : invitationStatus}
          </div>
          <h1 id="guest-home-title" aria-label={`Bem-vindo, ${heroName}`}>
            <span>Bem-vindo,</span>
            <strong>{heroName}</strong>
          </h1>
          <p>
            {primaryGuest
              ? `Ola, ${primaryGuest.fullName}. Seu convite esta pronto.`
              : "A contagem regressiva para o sim comecou"}
          </p>
        </section>

        {loadState === "error" ? (
          <PublicFeedback
            variant="error"
            title="Entre para ver seu convite completo"
            body="Quando a API estiver ativa e sua sessao de convidado estiver valida, esta tela carrega RSVP e eventos do seu convite."
            actionHref="/guest/login/code"
            actionLabel="Acessar com codigo"
          />
        ) : null}

        <section className={styles.bento} aria-label="Resumo do convite">
          <article className={`${styles.card} ${styles.countdownCard}`}>
            <div>
              <p className={styles.eyebrow}>Faltam apenas</p>
              <div className={styles.countdownGrid} aria-label={countdown.label}>
                {countdown.items.map((item, index) => (
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
              <p>
                {weddingEvent
                  ? formatEventLine(weddingEvent)
                  : "05 de Setembro, 2026 - Local a confirmar"}
              </p>
            </div>
          </article>

          <article className={`${styles.card} ${styles.rsvpCard}`}>
            <div className={styles.rsvpContent}>
              <div className={styles.iconBubble}>
                <img src="/guest-home/rsvp-icon.svg" alt="" aria-hidden="true" />
              </div>
              <h2>Status do RSVP</h2>
              <p>{rsvpSummary.body}</p>
              <div className={styles.statusPill} data-status={rsvpSummary.status}>
                <span />
                {rsvpSummary.label}
              </div>
            </div>
            <a className={styles.primaryCta} href="/rsvp">
              {rsvpSummary.cta}
            </a>
          </article>

          <article className={`${styles.card} ${styles.accessCodeCard}`}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.eyebrow}>Reentrada</p>
                <h2>Codigo de acesso</h2>
              </div>
              <a className={styles.sectionLink} href="/guest/login/code">
                Usar codigo
              </a>
            </div>
            <div className={styles.accessCodeValue}>
              <strong>{accessCode ?? "--------"}</strong>
            </div>
            <p className={styles.accessCodeCopy}>
              Guarde este codigo. Ele sera usado se voce entrar novamente em outro aparelho ou se a
              sessao expirar.
            </p>
          </article>

          <section className={styles.eventsCard} aria-label="Proximos eventos">
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.eyebrow}>Agenda do convite</p>
                <h2>Proximos eventos</h2>
              </div>
              <a className={styles.sectionLink} href="/events">
                Ver agenda
              </a>
            </div>
            <div className={styles.eventList}>
              {loadState === "loading" ? (
                <>
                  <EventSkeleton />
                  <EventSkeleton />
                </>
              ) : (
                nextEvents.map((event) => (
                  <a className={styles.eventItemLink} href="/events" key={event.id}>
                    <article className={styles.eventItem}>
                      <div className={styles.eventDate}>
                        <strong>{formatEventDay(event.startsAt)}</strong>
                        <span>{formatEventMonth(event.startsAt)}</span>
                      </div>
                      <div className={styles.eventContent}>
                        <div>
                          <h3>{event.name}</h3>
                          <p>
                            {formatEventTime(event.startsAt)} - {formatLocation(event)}
                          </p>
                        </div>
                        <span className={styles.eventType}>
                          {getEventTypeLabel(event.eventType)}
                        </span>
                      </div>
                    </article>
                  </a>
                ))
              )}
            </div>
          </section>

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
            eyebrow="Memorias coletivas"
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
          <blockquote>"O amor nao se ve com os olhos, mas com o coracao."</blockquote>
          <cite>Shakespeare</cite>
        </section>
      </main>

      <GuestBottomNav activeTab="home" />
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

function EventSkeleton() {
  return (
    <article className={`${styles.eventItem} ${styles.eventSkeleton}`}>
      <div className={styles.eventDate} />
      <div className={styles.eventContent}>
        <div>
          <span />
          <span />
        </div>
      </div>
    </article>
  );
}

function buildCountdown(dateInput: string | undefined) {
  const target = dateInput
    ? new Date(dateInput).getTime()
    : new Date("2026-09-05T16:00:00-03:00").getTime();
  const diff = Math.max(0, target - Date.now());
  const day = 1000 * 60 * 60 * 24;
  const hour = 1000 * 60 * 60;
  const minute = 1000 * 60;
  const days = Math.floor(diff / day);
  const hours = Math.floor((diff % day) / hour);
  const minutes = Math.floor((diff % hour) / minute);

  return {
    label: `${days} dias, ${hours} horas e ${minutes} minutos`,
    items: [
      { value: String(days).padStart(2, "0"), label: "Dias" },
      { value: String(hours).padStart(2, "0"), label: "Horas" },
      { value: String(minutes).padStart(2, "0"), label: "Min" },
    ],
  };
}

function buildRsvpSummary(events: EventDto[], responses: RsvpResponseDto[]) {
  const responseByEvent = new Map(responses.map((response) => [response.eventId, response]));
  const answered = events.filter((event) => responseByEvent.has(event.id));
  const pendingCount = Math.max(0, events.length - answered.length);

  if (events.length === 0) {
    return {
      body: "Assim que sua agenda estiver liberada, os eventos aparecem aqui para confirmacao.",
      cta: "Ver RSVP",
      label: "Aguardando eventos",
      status: "pending",
    };
  }

  if (pendingCount === 0) {
    return {
      body: "Todas as respostas desta agenda ja foram registradas. Voce ainda pode revisar os detalhes.",
      cta: "Revisar respostas",
      label: "Confirmacao enviada",
      status: "yes",
    };
  }

  return {
    body: `${pendingCount} evento${pendingCount === 1 ? "" : "s"} aguardando sua resposta. Confirme sua presenca quando puder.`,
    cta: "Confirmar presenca",
    label: "Confirmacao pendente",
    status: "pending",
  };
}

function formatEventLine(event: EventDto) {
  return `${formatFullDate(event.startsAt)} - ${event.location.venueName}`;
}
