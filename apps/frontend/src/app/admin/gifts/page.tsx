"use client";

import { useEffect, useMemo, useState } from "react";
import { type GiftCatalogItemDto, type GiftDto, adminApi } from "../../../lib/api";
import styles from "./page.module.css";

type LoadState = "loading" | "ready" | "error";
type FilterMode = "all" | "available" | "reserved" | "archived";
type ModalMode = "create" | "edit" | null;

const navItems = [
  { label: "Resumo", href: "/admin/dashboard", icon: "/admin-dashboard/nav-summary.svg" },
  { label: "Convidados", href: "/admin/guests", icon: "/admin-dashboard/nav-guests.svg" },
  {
    label: "Presentes",
    href: "/admin/gifts",
    icon: "/admin-dashboard/nav-gifts.svg",
    active: true,
  },
  { label: "Ajustes", href: "/admin/settings", icon: "/admin-dashboard/nav-settings.svg" },
];

const filterOptions: Array<{ label: string; value: FilterMode }> = [
  { label: "Todos", value: "all" },
  { label: "Disponivel", value: "available" },
  { label: "Reservado", value: "reserved" },
  { label: "Arquivado", value: "archived" },
];

type GiftFormState = {
  name: string;
  category: string;
  estimatedValue: string;
  displayOrder: string;
  status: "available" | "reserved" | "archived";
};

const defaultFormState: GiftFormState = {
  name: "",
  category: "",
  estimatedValue: "",
  displayOrder: "0",
  status: "available",
};

function toFormState(gift: GiftDto): GiftFormState {
  return {
    name: gift.name,
    category: gift.category,
    estimatedValue: gift.estimatedValue == null ? "" : String(gift.estimatedValue),
    displayOrder: String(gift.displayOrder),
    status: gift.status,
  };
}

function fromFormState(form: GiftFormState) {
  return {
    name: form.name.trim(),
    category: form.category.trim(),
    description: undefined,
    estimatedValue: form.estimatedValue.trim() ? Number(form.estimatedValue) : undefined,
    imageUrl: undefined,
    displayOrder: Number(form.displayOrder),
    status: form.status,
    isActive: form.status !== "archived",
  };
}

export default function AdminGiftsPage() {
  const [items, setItems] = useState<GiftDto[]>([]);
  const [catalogItems, setCatalogItems] = useState<GiftCatalogItemDto[]>([]);
  const [guestNameById, setGuestNameById] = useState<Record<string, string>>({});
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedGiftId, setSelectedGiftId] = useState<string | null>(null);
  const [form, setForm] = useState<GiftFormState>(defaultFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadGifts() {
      try {
        const [giftsResult, catalogResult, guestsResult] = await Promise.all([
          adminApi.listGifts({
            page: 1,
            pageSize: 100,
          }),
          adminApi.listGiftReservations({
            page: 1,
            pageSize: 100,
          }),
          adminApi.listGuests({
            page: 1,
            pageSize: 100,
            status: "active",
          }),
        ]);

        if (!isMounted) {
          return;
        }

        setItems(giftsResult.items);
        setCatalogItems(catalogResult.items);
        setGuestNameById(
          Object.fromEntries(
            guestsResult.items.map((entry) => [entry.guest.id, entry.guest.fullName]),
          ),
        );
        setLoadState("ready");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        console.error("Failed to load gifts:", error);
        setLoadState("error");
      }
    }

    void loadGifts();

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedGift = useMemo(
    () => items.find((gift) => gift.id === selectedGiftId) ?? null,
    [items, selectedGiftId],
  );

  const filteredItems = useMemo(() => {
    if (filterMode === "all") {
      return items;
    }
    return items.filter((gift) => gift.status === filterMode);
  }, [filterMode, items]);

  const reservationByGiftId = useMemo(
    () =>
      Object.fromEntries(
        catalogItems
          .filter((entry) => entry.activeReservation)
          .map((entry) => [entry.gift.id, entry.activeReservation]),
      ),
    [catalogItems],
  );

  const stats = useMemo(() => {
    const totalEstimated = items.reduce((sum, gift) => sum + (gift.estimatedValue ?? 0), 0);
    const reservedCount = items.filter((gift) => gift.status === "reserved").length;
    const availableCount = items.filter((gift) => gift.status === "available").length;
    return { totalEstimated, reservedCount, availableCount };
  }, [items]);

  function openCreateModal() {
    const nextDisplayOrder = items.reduce((max, gift) => Math.max(max, gift.displayOrder), 0) + 1;

    setForm({
      ...defaultFormState,
      displayOrder: String(nextDisplayOrder),
    });
    setSelectedGiftId(null);
    setModalMode("create");
  }

  function openEditModal(gift: GiftDto) {
    setSelectedGiftId(gift.id);
    setForm(toFormState(gift));
    setModalMode("edit");
  }

  function closeModal() {
    setModalMode(null);
    setSelectedGiftId(null);
    setForm(defaultFormState);
    setIsSubmitting(false);
  }

  async function handleSave() {
    const payload = fromFormState(form);

    if (!payload.name || !payload.category || Number.isNaN(payload.displayOrder)) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (modalMode === "create") {
        const created = await adminApi.createGift(payload);
        setItems((current) => [created, ...current]);
      } else if (modalMode === "edit" && selectedGift) {
        const updated = await adminApi.updateGift(selectedGift.id, payload);
        setItems((current) => current.map((gift) => (gift.id === updated.id ? updated : gift)));
      }

      closeModal();
    } catch (error) {
      console.error("Failed to save gift:", error);
      setIsSubmitting(false);
    }
  }

  async function handleArchive(gift: GiftDto) {
    if (gift.status === "archived") {
      return;
    }

    try {
      const updated = await adminApi.updateGift(gift.id, {
        name: gift.name,
        category: gift.category,
        description: gift.description ?? undefined,
        estimatedValue: gift.estimatedValue ?? undefined,
        imageUrl: gift.imageUrl ?? undefined,
        displayOrder: gift.displayOrder,
        status: "archived",
        isActive: false,
      });

      setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (error) {
      console.error("Failed to archive gift:", error);
    }
  }

  return (
    <div className={styles.shell}>
      <header className={styles.topBar} aria-label="Navegacao principal administrativa">
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
        <section className={styles.hero}>
          <h1>Gestao de Presentes</h1>
          <p>
            Monitore contribuicoes, mantenha sua lista organizada e ajuste itens conforme o
            andamento do evento.
          </p>
        </section>

        <section className={styles.mainStatCard}>
          <p>Total arrecadado</p>
          <strong>{formatMoney(stats.totalEstimated)}</strong>
          <small>{stats.reservedCount} itens reservados no momento</small>
        </section>

        <section className={styles.sideStats}>
          <article className={styles.sideCard}>
            <p>Itens disponiveis</p>
            <strong>{stats.availableCount}</strong>
          </article>
          <article className={styles.sideCard}>
            <p>Total de presentes</p>
            <strong>{items.length}</strong>
          </article>
        </section>

        <section className={styles.toolbar}>
          <div className={styles.filters}>
            {filterOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={filterMode === option.value ? styles.filterActive : styles.filter}
                onClick={() => setFilterMode(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button type="button" className={styles.addButton} onClick={openCreateModal}>
            + Novo item
          </button>
        </section>

        {loadState === "error" ? (
          <section className={styles.emptyState}>
            <h2>Falha ao carregar</h2>
            <p>Verifique sua sessao administrativa e tente novamente.</p>
          </section>
        ) : null}

        <section className={styles.list}>
          {filteredItems.length === 0 ? (
            <article className={styles.emptyState}>
              <h2>Nenhum item encontrado</h2>
              <p>Ajuste o filtro para visualizar outros presentes.</p>
            </article>
          ) : null}

          {filteredItems
            .slice()
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((gift) => (
              <article className={styles.giftCard} key={gift.id}>
                <div className={styles.giftHeader}>
                  <div>
                    <h2>{gift.name}</h2>
                    <p>{gift.category}</p>
                  </div>
                  <span
                    className={`${styles.statusBadge} ${
                      gift.status === "available"
                        ? styles.statusAvailable
                        : gift.status === "reserved"
                          ? styles.statusReserved
                          : styles.statusArchived
                    }`}
                  >
                    {gift.status === "available"
                      ? "Disponivel"
                      : gift.status === "reserved"
                        ? "Reservado"
                        : "Arquivado"}
                  </span>
                </div>

                <div className={styles.giftMeta}>
                  <strong>{formatMoney(gift.estimatedValue)}</strong>
                  <span>Ordem #{gift.displayOrder}</span>
                </div>

                {reservationByGiftId[gift.id] ? (
                  <div className={styles.reservationInfo}>
                    <p>
                      Reservado por{" "}
                      <strong>
                        {guestNameById[reservationByGiftId[gift.id]?.guestId ?? ""] ??
                          "Convidado nao identificado"}
                      </strong>
                    </p>
                    <span>
                      {formatDateTime(
                        reservationByGiftId[gift.id]?.reservedAt ?? new Date().toISOString(),
                      )}
                    </span>
                  </div>
                ) : null}

                <div className={styles.giftActions}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => openEditModal(gift)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => handleArchive(gift)}
                  >
                    Arquivar
                  </button>
                </div>
              </article>
            ))}
        </section>
      </main>

      {modalMode ? (
        <div className={styles.modalLayer} role="presentation">
          <button
            type="button"
            className={styles.modalBackdrop}
            onClick={closeModal}
            aria-label="Fechar modal"
          />
          <dialog className={styles.modalCard} open aria-label="Formulario de presente">
            <header className={styles.modalHeader}>
              <h3>{modalMode === "create" ? "Novo presente" : "Editar presente"}</h3>
              <button type="button" className={styles.closeButton} onClick={closeModal}>
                Fechar
              </button>
            </header>

            <label className={styles.field}>
              <span>Nome</span>
              <input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Nome do presente"
              />
            </label>

            <label className={styles.field}>
              <span>Categoria</span>
              <input
                value={form.category}
                onChange={(event) =>
                  setForm((current) => ({ ...current, category: event.target.value }))
                }
                placeholder="Categoria"
              />
            </label>

            <div className={styles.fieldGrid}>
              <label className={styles.field}>
                <span>Valor estimado</span>
                <input
                  type="number"
                  min={0}
                  value={form.estimatedValue}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, estimatedValue: event.target.value }))
                  }
                  placeholder="0"
                />
              </label>
              <label className={styles.field}>
                <span>Ordem</span>
                <input
                  type="number"
                  min={0}
                  value={form.displayOrder}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, displayOrder: event.target.value }))
                  }
                />
              </label>
            </div>

            <label className={styles.field}>
              <span>Status</span>
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status: event.target.value as GiftFormState["status"],
                  }))
                }
              >
                <option value="available">Disponivel</option>
                <option value="reserved">Reservado</option>
                <option value="archived">Arquivado</option>
              </select>
            </label>

            <button
              type="button"
              className={styles.primaryButton}
              onClick={handleSave}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Salvando..." : "Salvar"}
            </button>
          </dialog>
        </div>
      ) : null}

      <nav className={styles.bottomNav} aria-label="Navegacao inferior administrativa">
        {navItems.map((item) => (
          <a
            key={item.href}
            className={`${styles.navItem} ${item.active ? styles.navItemActive : ""}`}
            href={item.href}
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

function formatMoney(value: number | null) {
  const normalized = value ?? 0;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(normalized);
}

function formatDateTime(isoDate: string) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
