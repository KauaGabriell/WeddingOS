"use client";

import { useEffect, useMemo, useState } from "react";
import { GuestBottomNav } from "../../components/guest-bottom-nav/guest-bottom-nav";
import { PublicFeedback } from "../../components/public-feedback/public-feedback";
import { type EventDto, type GuestHomeDto, type RsvpResponseStatus, guestApi } from "../../lib/api";
import {
  fallbackEvents,
  formatEventTime,
  formatFullDate,
  formatLocation,
  getEventTypeLabel,
  sortEventsByStart,
} from "../../lib/guest-events";
import styles from "./page.module.css";

type LoadState = "loading" | "ready" | "error";
type SubmitState = "idle" | "submitting" | "success" | "error";
type SubmitOutcome = "created" | "updated" | "replayed" | null;

export default function GuestRsvpPage() {
  const [home, setHome] = useState<GuestHomeDto | null>(null);
  const [events, setEvents] = useState<EventDto[]>(fallbackEvents);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [submitOutcome, setSubmitOutcome] = useState<SubmitOutcome>(null);
  const [submitMessage, setSubmitMessage] = useState("Confirme sua presenca para cada evento.");

  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [responseStatus, setResponseStatus] = useState<RsvpResponseStatus>("yes");
  const [companionsConfirmed, setCompanionsConfirmed] = useState<number>(0);
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const [homeResponse, eventsResponse] = await Promise.all([
          guestApi.getHome(),
          guestApi.listEvents(),
        ]);
        if (!isMounted) {
          return;
        }

        const activeEvents =
          eventsResponse.items.length > 0 ? eventsResponse.items : homeResponse.events;
        const sorted = sortEventsByStart(activeEvents.length > 0 ? activeEvents : fallbackEvents);

        setHome(homeResponse);
        setEvents(sorted);
        setSelectedEventId(sorted[0]?.id ?? "");
        setLoadState("ready");
      } catch {
        if (!isMounted) {
          return;
        }
        const sorted = sortEventsByStart(fallbackEvents);
        setEvents(sorted);
        setSelectedEventId(sorted[0]?.id ?? "");
        setLoadState("error");
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? events[0] ?? null;
  const responseByEvent = useMemo(
    () => new Map((home?.responses ?? []).map((response) => [response.eventId, response])),
    [home?.responses],
  );
  const selectedEventResponse = selectedEventId ? responseByEvent.get(selectedEventId) : undefined;

  useEffect(() => {
    if (!selectedEventId) {
      return;
    }
    const existing = responseByEvent.get(selectedEventId);
    if (!existing) {
      setResponseStatus("yes");
      setCompanionsConfirmed(0);
      setMessage("");
      return;
    }
    setResponseStatus(existing.responseStatus);
    setCompanionsConfirmed(existing.companionsConfirmed);
    setMessage(existing.message ?? "");
  }, [selectedEventId, responseByEvent]);

  function updateCompanions(next: number) {
    setCompanionsConfirmed(Math.max(0, next));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedEventId) {
      return;
    }

    setSubmitState("submitting");
    setSubmitOutcome(null);
    setSubmitMessage("Enviando sua confirmacao...");

    try {
      const result = await guestApi.submitRsvp({
        eventId: selectedEventId,
        responseStatus,
        companionsConfirmed: responseStatus === "no" ? 0 : companionsConfirmed,
        message: message.trim() ? message.trim() : undefined,
      });

      setHome((current) => {
        if (!current) {
          return current;
        }

        const nextResponses = current.responses.filter(
          (response) => response.eventId !== result.persistedResponse.eventId,
        );
        nextResponses.push(result.persistedResponse);

        return {
          ...current,
          responses: nextResponses,
        };
      });

      setSubmitState("success");
      setSubmitOutcome(result.outcome);
      setSubmitMessage(
        result.outcome === "replayed"
          ? "Resposta ja registrada. Nada foi duplicado."
          : result.outcome === "updated"
            ? "Confirmacao atualizada com sucesso."
            : "Confirmacao enviada com sucesso.",
      );
    } catch {
      setSubmitState("error");
      setSubmitOutcome(null);
      setSubmitMessage("Nao foi possivel enviar agora. Tente novamente em instantes.");
    }
  }

  return (
    <div className={styles.shell}>
      <header className={styles.topBar} aria-label="Navegacao principal do convidado">
        <div className={styles.brandGroup}>
          <button className={styles.avatarButton} type="button" aria-label="Perfil">
            <img src="/guest-home/profile-avatar.jpg" alt="" aria-hidden="true" />
          </button>
          <a className={styles.brand} href="/guest/home">
            Wedding OS
          </a>
        </div>
        <span className={styles.menuDots} aria-hidden="true" />
      </header>

      <main className={styles.main}>
        <section className={styles.hero} aria-labelledby="rsvp-title">
          <p className={styles.eyebrow}>Confirmacao de Presenca</p>
          <h1 id="rsvp-title">Voce e nosso convidado.</h1>
          <p>
            Selecione um evento e confirme sua resposta. O limite de acompanhantes reflete seu
            convite.
          </p>
        </section>

        {loadState === "error" ? (
          <PublicFeedback
            variant="error"
            title="Modo visual ativo"
            body="Conecte sua sessao para salvar respostas reais no convite."
            actionHref="/guest/login/code"
            actionLabel="Entrar com codigo"
          />
        ) : null}

        {events.length === 0 ? (
          <PublicFeedback
            variant="empty"
            title="Nenhum evento disponivel"
            body="Ainda nao ha eventos elegiveis para confirmar presenca."
            actionHref="/events"
            actionLabel="Ver agenda"
          />
        ) : null}

        <section className={styles.content}>
          {events.length > 0 ? (
            <form className={styles.formCard} onSubmit={handleSubmit}>
              <label className={styles.fieldLabel} htmlFor="event">
                Evento
              </label>
              <select
                id="event"
                className={styles.select}
                value={selectedEventId}
                onChange={(event) => setSelectedEventId(event.target.value)}
              >
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name}
                  </option>
                ))}
              </select>
              {selectedEventResponse ? (
                <p className={styles.existingResponseNotice}>
                  Voce ja confirmou presenca para esse evento.
                </p>
              ) : null}

              <div className={styles.presenceSection}>
                <p className={styles.fieldLabel}>Presenca</p>
                <div className={styles.toggleRow}>
                  <button
                    className={responseStatus === "yes" ? styles.toggleActive : styles.toggle}
                    type="button"
                    onClick={() => setResponseStatus("yes")}
                  >
                    Sim
                  </button>
                  <button
                    className={responseStatus === "no" ? styles.toggleActive : styles.toggle}
                    type="button"
                    onClick={() => setResponseStatus("no")}
                  >
                    Nao vou
                  </button>
                </div>
              </div>

              <div className={styles.companionSection}>
                <div className={styles.companionHeader}>
                  <p className={styles.fieldLabel}>Acompanhantes</p>
                  <span>Quantidade</span>
                </div>
                <div className={styles.stepper}>
                  <button
                    type="button"
                    onClick={() => updateCompanions(companionsConfirmed - 1)}
                    disabled={responseStatus === "no"}
                    aria-label="Diminuir acompanhantes"
                  >
                    -
                  </button>
                  <strong>{responseStatus === "no" ? 0 : companionsConfirmed}</strong>
                  <button
                    type="button"
                    onClick={() => updateCompanions(companionsConfirmed + 1)}
                    disabled={responseStatus === "no"}
                    aria-label="Aumentar acompanhantes"
                  >
                    +
                  </button>
                </div>
              </div>

              <label className={styles.fieldLabel} htmlFor="message">
                Recado para os noivos
              </label>
              <input
                id="message"
                className={styles.input}
                placeholder="Deixe uma mensagem carinhosa..."
                value={message}
                maxLength={240}
                onChange={(event) => setMessage(event.target.value)}
              />

              <button className={styles.cta} type="submit" disabled={submitState === "submitting"}>
                {submitState === "submitting" ? "ENVIANDO..." : "CONFIRMAR PRESENCA"}
              </button>

              <p
                className={styles.feedback}
                data-state={submitState}
                data-outcome={submitOutcome ?? undefined}
              >
                {submitMessage}
              </p>
            </form>
          ) : null}

          {selectedEvent ? (
            <article className={styles.eventCard}>
              <img src={getEventCover(selectedEvent)} alt="" aria-hidden="true" />
              <div className={styles.eventGradient} />
              <div className={styles.eventBody}>
                <p className={styles.eventType}>{getEventTypeLabel(selectedEvent.eventType)}</p>
                <h2>{selectedEvent.name}</h2>
                <p>{formatFullDate(selectedEvent.startsAt)}</p>
                <p>{formatEventTime(selectedEvent.startsAt)}h</p>
                <p>{formatLocation(selectedEvent)}</p>
              </div>
            </article>
          ) : null}
        </section>
      </main>

      <GuestBottomNav activeTab="rsvp" />
    </div>
  );
}

function getEventCover(event: EventDto) {
  return event.eventType === "wedding"
    ? "/rsvp/golden-wedding-rings.webp"
    : "/rsvp/ideias-para-cha-de-panela-22.jpg";
}
