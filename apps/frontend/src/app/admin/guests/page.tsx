"use client";

import { useEffect, useMemo, useState } from "react";
import { type AdminGuestListDto, type AdminGuestRowDto, adminApi } from "../../../lib/api";
import styles from "./page.module.css";

type FilterMode = "all" | "confirmed" | "pending" | "declined";
type LoadState = "loading" | "ready" | "error";
type GuestStatus = "confirmed" | "pending" | "declined";
type ModalMode = "details" | "edit" | null;

const navItems = [
  { label: "Resumo", href: "/admin/dashboard", icon: "/admin-dashboard/nav-summary.svg" },
  {
    label: "Convidados",
    href: "/admin/guests",
    icon: "/admin-dashboard/nav-guests.svg",
    active: true,
  },
  { label: "Presentes", href: "/admin/gifts", icon: "/admin-dashboard/nav-gifts.svg" },
  { label: "Ajustes", href: "/admin/settings", icon: "/admin-dashboard/nav-settings.svg" },
];

function formatMeta(row: AdminGuestRowDto) {
  if (row.guest.isPrimary) {
    return `${row.guestGroup.allowedCompanions} acompanhante${row.guestGroup.allowedCompanions === 1 ? "" : "s"}`;
  }

  return row.guestGroup.displayName;
}

function getGuestStatus(row: AdminGuestRowDto): GuestStatus {
  const latestResponse = row.responses
    .slice()
    .sort(
      (a, b) =>
        new Date(b.updatedAt ?? b.createdAt).getTime() -
        new Date(a.updatedAt ?? a.createdAt).getTime(),
    )[0];

  if (!latestResponse) {
    return "pending";
  }

  if (latestResponse.responseStatus === "yes") {
    return "confirmed";
  }

  if (latestResponse.responseStatus === "no") {
    return "declined";
  }

  return "pending";
}

function getStatusLabel(status: GuestStatus) {
  if (status === "confirmed") {
    return "Confirmado";
  }

  if (status === "declined") {
    return "Não vão";
  }

  return "Pendente";
}

export default function AdminGuestsPage() {
  const [rows, setRows] = useState<AdminGuestRowDto[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAllowedCompanions, setEditAllowedCompanions] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadGuests() {
      try {
        const response: AdminGuestListDto = await adminApi.listGuests({
          page: 1,
          pageSize: 100,
          status: "active",
        });

        if (!isMounted) {
          return;
        }

        setRows(response.items);
        setLoadState("ready");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        console.error("Failed to load guests:", error);
        setLoadState("error");
      }
    }

    void loadGuests();

    return () => {
      isMounted = false;
    };
  }, []);

  const visibleRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return rows.filter((row) => {
      const guestStatus = getGuestStatus(row);

      if (filterMode === "confirmed" && guestStatus !== "confirmed") {
        return false;
      }

      if (filterMode === "pending" && guestStatus !== "pending") {
        return false;
      }

      if (filterMode === "declined" && guestStatus !== "declined") {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return (
        row.guest.fullName.toLowerCase().includes(normalizedSearch) ||
        row.guestGroup.displayName.toLowerCase().includes(normalizedSearch) ||
        (row.guest.phone ?? "").includes(normalizedSearch)
      );
    });
  }, [filterMode, rows, search]);

  const selectedRow = useMemo(
    () => rows.find((row) => row.guest.id === selectedGuestId) ?? null,
    [rows, selectedGuestId],
  );

  const familyMembers = useMemo(() => {
    if (!selectedRow) {
      return [];
    }

    return rows
      .filter((row) => row.guest.guestGroupId === selectedRow.guest.guestGroupId)
      .sort((a, b) => Number(b.guest.isPrimary) - Number(a.guest.isPrimary));
  }, [rows, selectedRow]);

  function openDetails(row: AdminGuestRowDto) {
    setSelectedGuestId(row.guest.id);
    setModalMode("details");
  }

  function openEdit(row: AdminGuestRowDto) {
    setSelectedGuestId(row.guest.id);
    setEditFullName(row.guest.fullName);
    setEditPhone(row.guest.phone ?? "");
    setEditAllowedCompanions(row.guestGroup.allowedCompanions);
    setModalMode("edit");
  }

  function closeModal() {
    setModalMode(null);
    setSelectedGuestId(null);
    setIsSubmitting(false);
  }

  async function handleSave() {
    if (!selectedRow) {
      return;
    }

    setIsSubmitting(true);

    try {
      const updated = await adminApi.updateGuest(selectedRow.guest.id, {
        fullName: editFullName.trim(),
        phone: editPhone.trim() || null,
        allowedCompanions: editAllowedCompanions,
      });

      setRows((current) =>
        current.map((row) =>
          row.guest.id === updated.id
            ? {
                ...row,
                guest: updated,
                guestGroup: { ...row.guestGroup, allowedCompanions: editAllowedCompanions },
              }
            : row,
        ),
      );
      closeModal();
    } catch (error) {
      console.error("Failed to update guest:", error);
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!selectedRow) {
      return;
    }

    setIsSubmitting(true);

    try {
      await adminApi.updateGuest(selectedRow.guest.id, {
        status: "inactive",
      });

      setRows((current) => current.filter((row) => row.guest.id !== selectedRow.guest.id));
      closeModal();
    } catch (error) {
      console.error("Failed to deactivate guest:", error);
      setIsSubmitting(false);
    }
  }

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
        <section className={styles.hero}>
          <p className={styles.eyebrow}>Lista de Presenca</p>
          <h1>Gerenciar Convidados</h1>
        </section>

        <section className={styles.controlsSection}>
          <label className={styles.searchField} htmlFor="guest-search">
            <span className={styles.searchIcon} aria-hidden="true" />
            <input
              id="guest-search"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nome..."
              type="search"
              value={search}
            />
          </label>

          <div className={styles.filterPanel} aria-label="Filtros de convidados">
            {[
              { id: "all", label: "Todos" },
              { id: "confirmed", label: "Confirmados" },
              { id: "pending", label: "Pendentes" },
              { id: "declined", label: "Não vão" },
            ].map((filter) => (
              <button
                className={`${styles.filterButton} ${
                  filterMode === filter.id ? styles.filterButtonActive : ""
                }`}
                key={filter.id}
                onClick={() => setFilterMode(filter.id as FilterMode)}
                type="button"
              >
                {filter.label}
              </button>
            ))}
          </div>
        </section>

        <section className={styles.listSection} aria-label="Lista de convidados">
          {visibleRows.map((row) => (
            <article className={styles.guestCard} key={row.guest.id}>
              <div className={styles.cardHeader}>
                <div className={styles.cardHeading}>
                  <h2>{row.guest.fullName}</h2>
                  <p>
                    <span className={styles.metaIcon} aria-hidden="true" />
                    {row.guest.phone ?? formatMeta(row)}
                  </p>
                </div>
                <span className={`${styles.badge} ${styles[`badge${getGuestStatus(row)}`]}`}>
                  {getStatusLabel(getGuestStatus(row))}
                </span>
              </div>

              <div className={styles.cardActions}>
                <button className={styles.warmAction} onClick={() => openEdit(row)} type="button">
                  <span className={styles.actionIcon} aria-hidden="true" />
                  Editar
                </button>
                <button
                  className={styles.outlineAction}
                  onClick={() => openDetails(row)}
                  type="button"
                >
                  <span className={styles.actionIcon} aria-hidden="true" />
                  Dados
                </button>
                <button
                  className={styles.iconAction}
                  type="button"
                  onClick={() => openEdit(row)}
                  aria-label="Desativar convidado"
                >
                  <span />
                </button>
              </div>
            </article>
          ))}

          {loadState === "loading" ? (
            <p className={styles.modeNotice}>Carregando convidados...</p>
          ) : null}
          {loadState === "error" ? (
            <p className={styles.modeNotice}>Falha ao carregar convidados. Atualize a pagina.</p>
          ) : null}
        </section>
      </main>

      <button className={styles.fabButton} type="button" aria-label="Adicionar convidado">
        <span className={styles.fabIcon} aria-hidden="true" />
      </button>

      <nav className={styles.bottomNav} aria-label="Navegacao inferior administrativa">
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

      {modalMode && selectedRow ? (
        <>
          <button
            aria-label="Fechar modal"
            className={styles.modalBackdrop}
            onClick={closeModal}
            type="button"
          />
          <dialog
            className={styles.modalCard}
            open
            aria-label={modalMode === "details" ? "Dados do convidado" : "Editar convidado"}
          >
            <header className={styles.modalHeader}>
              <h2>{modalMode === "details" ? "Dados do convidado" : "Editar convidado"}</h2>
              <button className={styles.modalClose} type="button" onClick={closeModal}>
                Fechar
              </button>
            </header>

            {modalMode === "details" ? (
              <div className={styles.modalBody}>
                <p>
                  <strong>Nome:</strong> {selectedRow.guest.fullName}
                </p>
                <p>
                  <strong>Telefone:</strong> {selectedRow.guest.phone ?? "Nao informado"}
                </p>
                <p>
                  <strong>Grupo:</strong> {selectedRow.guestGroup.displayName}
                </p>
                <div className={styles.companionsBlock}>
                  <strong>Membros do grupo</strong>
                  <ul>
                    {familyMembers.map((member) => (
                      <li key={member.guest.id}>
                        {member.guest.fullName}
                        {member.guest.isPrimary ? " (Principal)" : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className={styles.modalBody}>
                <label className={styles.modalField}>
                  <span>Nome completo</span>
                  <input
                    type="text"
                    value={editFullName}
                    onChange={(event) => setEditFullName(event.target.value)}
                  />
                </label>
                <label className={styles.modalField}>
                  <span>Telefone</span>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(event) => setEditPhone(event.target.value)}
                  />
                </label>
                <label className={styles.modalField}>
                  <span>Acompanhantes permitidos</span>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={editAllowedCompanions}
                    onChange={(event) => setEditAllowedCompanions(Number(event.target.value))}
                  />
                </label>

                <div className={styles.modalActions}>
                  <button
                    className={styles.modalPrimary}
                    type="button"
                    disabled={isSubmitting || !editFullName.trim()}
                    onClick={() => void handleSave()}
                  >
                    Salvar
                  </button>
                  <button
                    className={styles.modalDanger}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => void handleDelete()}
                  >
                    Excluir convidado
                  </button>
                </div>
              </div>
            )}
          </dialog>
        </>
      ) : null}
    </div>
  );
}
