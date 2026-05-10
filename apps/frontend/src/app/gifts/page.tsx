"use client";

import { useEffect, useMemo, useState } from "react";
import { GuestBottomNav } from "../../components/guest-bottom-nav/guest-bottom-nav";
import { MobileTopBar } from "../../components/mobile-top-bar/mobile-top-bar";
import { PublicFeedback } from "../../components/public-feedback/public-feedback";
import { ApiRequestError, type GiftCatalogItemDto, guestApi } from "../../lib/api";
import styles from "./page.module.css";

type LoadState = "loading" | "ready" | "error";
type ReservationFilter = "available" | "reserved";

const fallbackItems: GiftCatalogItemDto[] = [
  {
    gift: {
      id: "fallback-1",
      name: "Jogo de panelas inox",
      category: "cozinha",
      description: null,
      estimatedValue: 790,
      imageUrl: null,
      displayOrder: 1,
      status: "available",
      isActive: true,
      createdAt: "",
      updatedAt: "",
    },
    activeReservation: null,
  },
  {
    gift: {
      id: "fallback-2",
      name: "Jantar especial na lua de mel",
      category: "lua de mel",
      description: null,
      estimatedValue: 450,
      imageUrl: null,
      displayOrder: 2,
      status: "reserved",
      isActive: true,
      createdAt: "",
      updatedAt: "",
    },
    activeReservation: {
      id: "reservation-2",
      giftId: "fallback-2",
      guestId: "guest-2",
      reservationStatus: "active",
      purchaseNotes: null,
      reservedAt: "",
      releasedAt: null,
      releasedByAdminUserId: null,
      createdAt: "",
      updatedAt: "",
    },
  },
];

export default function GiftsPage() {
  const [items, setItems] = useState<GiftCatalogItemDto[]>(fallbackItems);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [activeReservationFilter, setActiveReservationFilter] =
    useState<ReservationFilter>("available");
  const [reserveTargetGiftId, setReserveTargetGiftId] = useState<string | null>(null);
  const [reserveNotes, setReserveNotes] = useState("");
  const [reserveState, setReserveState] = useState<"idle" | "submitting">("idle");
  const [reserveFeedback, setReserveFeedback] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadGifts() {
      try {
        const response = await guestApi.listGifts({
          reservationStatus: activeReservationFilter,
          page: 1,
          pageSize: 40,
        });

        if (!isMounted) {
          return;
        }

        setItems(response.items);
        setLoadState("ready");
      } catch {
        if (!isMounted) {
          return;
        }
        setItems(fallbackItems);
        setLoadState("error");
      }
    }

    loadGifts();
    return () => {
      isMounted = false;
    };
  }, [activeReservationFilter]);

  const reserveTarget = useMemo(
    () => items.find((item) => item.gift.id === reserveTargetGiftId) ?? null,
    [items, reserveTargetGiftId],
  );

  async function handleReserveGift() {
    if (!reserveTarget) {
      return;
    }

    setReserveState("submitting");
    setReserveFeedback(null);

    try {
      await guestApi.reserveGift(reserveTarget.gift.id, {
        purchaseNotes: reserveNotes.trim() ? reserveNotes.trim() : undefined,
      });

      setItems((current) =>
        current.map((item) =>
          item.gift.id === reserveTarget.gift.id
            ? {
                ...item,
                gift: {
                  ...item.gift,
                  status: "reserved",
                },
                activeReservation: item.activeReservation ?? {
                  id: "local-reservation",
                  giftId: item.gift.id,
                  guestId: "self",
                  reservationStatus: "active",
                  purchaseNotes: reserveNotes.trim() || null,
                  reservedAt: new Date().toISOString(),
                  releasedAt: null,
                  releasedByAdminUserId: null,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
              }
            : item,
        ),
      );

      setReserveFeedback("Presente reservado com sucesso.");
      setReserveTargetGiftId(null);
      setReserveNotes("");
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 409) {
        setReserveFeedback("Este presente acabou de ser reservado por outro convidado.");
        setReserveTargetGiftId(null);
        return;
      }

      setReserveFeedback("Nao foi possivel concluir a reserva agora. Tente novamente.");
    } finally {
      setReserveState("idle");
    }
  }

  return (
    <div className={styles.shell}>
      <MobileTopBar
        variant="guest"
        brandHref="/guest/home"
        avatarSrc="/guest-home/profile-avatar.jpg"
      />

      <main className={styles.main}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>Lista de Presentes</p>
          <h1>Nossa Lista de Desejos</h1>
          <p>
            Sua presenca e o maior presente. Se quiser presentear, escolha um item da lista. Nesta
            etapa, mostramos apenas nome e valor.
          </p>
        </section>

        {loadState === "error" ? (
          <PublicFeedback
            variant="error"
            title="Modo visual ativo"
            body="Conecte sua sessao para listar os presentes reais do evento."
            actionHref="/guest/login/code"
            actionLabel="Entrar com codigo"
          />
        ) : null}

        <section className={styles.filters}>
          <div className={styles.filterRow}>
            <button
              type="button"
              className={activeReservationFilter === "available" ? styles.chipActive : styles.chip}
              onClick={() => setActiveReservationFilter("available")}
            >
              Disponivel
            </button>
            <button
              type="button"
              className={activeReservationFilter === "reserved" ? styles.chipActive : styles.chip}
              onClick={() => setActiveReservationFilter("reserved")}
            >
              Reservado
            </button>
          </div>
        </section>

        <section className={styles.list}>
          {items.length === 0 ? (
            <PublicFeedback
              variant="empty"
              title="Nenhum presente encontrado"
              body="Ajuste os filtros para buscar outros itens."
            />
          ) : null}

          {items.map(({ gift, activeReservation }) => {
            const isReserved = Boolean(activeReservation) || gift.status === "reserved";
            return (
              <article
                key={gift.id}
                className={`${styles.giftCard} ${isReserved ? styles.giftCardReserved : ""}`}
              >
                <header className={styles.giftHeader}>
                  <p className={styles.giftCategory}>{gift.category}</p>
                  <span className={isReserved ? styles.statusReserved : styles.statusAvailable}>
                    {isReserved ? "Reservado" : "Disponivel"}
                  </span>
                </header>

                <h2>{gift.name}</h2>

                <div className={styles.giftFooter}>
                  <strong>{formatMoney(gift.estimatedValue)}</strong>
                  <button
                    type="button"
                    className={isReserved ? styles.ctaDisabled : styles.cta}
                    disabled={isReserved}
                    onClick={() => setReserveTargetGiftId(gift.id)}
                  >
                    {isReserved ? "INDISPONIVEL" : "SELECIONAR"}
                  </button>
                </div>
              </article>
            );
          })}
        </section>

        {reserveFeedback ? <p className={styles.reserveFeedback}>{reserveFeedback}</p> : null}

        {reserveTarget ? (
          <section className={styles.reservePanel} aria-label="Confirmacao de reserva">
            <h3>Confirmar reserva</h3>
            <p>
              Voce esta reservando <strong>{reserveTarget.gift.name}</strong> por{" "}
              <strong>{formatMoney(reserveTarget.gift.estimatedValue)}</strong>.
            </p>
            <label htmlFor="reserveNotes">Observacao de compra (opcional)</label>
            <input
              id="reserveNotes"
              value={reserveNotes}
              maxLength={500}
              onChange={(event) => setReserveNotes(event.target.value)}
              placeholder="Ex: vou comprar ate sexta-feira."
            />
            <div className={styles.reserveActions}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={() => setReserveTargetGiftId(null)}
                disabled={reserveState === "submitting"}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.confirmButton}
                onClick={handleReserveGift}
                disabled={reserveState === "submitting"}
              >
                {reserveState === "submitting" ? "RESERVANDO..." : "CONFIRMAR RESERVA"}
              </button>
            </div>
          </section>
        ) : null}
      </main>

      <GuestBottomNav activeTab="gifts" />
    </div>
  );
}

function formatMoney(value: number | null) {
  if (value === null) {
    return "A combinar";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(value);
}
