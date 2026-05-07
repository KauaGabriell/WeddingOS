"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import {
  GUEST_ACCESS_CODE_STORAGE_KEY,
  type OpenGuestAccessRegistrationDto,
  authApi,
} from "../../../lib/api";
import styles from "./page.module.css";

type SubmitStatus = "idle" | "submitting" | "success" | "error" | "token-loading";

type FormState = {
  fullName: string;
  phone: string;
  companionsCount: number;
  companionNames: string[];
};

const INITIAL_FORM_STATE: FormState = {
  fullName: "",
  phone: "",
  companionsCount: 0,
  companionNames: [],
};
const COMPANION_COUNT_OPTIONS = [0, 1, 2, 3, 4, 5, 6] as const;

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

function formatPhoneInput(value: string) {
  const digits = normalizePhone(value).slice(0, 15);

  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length <= 7) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }

  if (digits.length <= 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  return `+${digits.slice(0, digits.length - 11)} (${digits.slice(-11, -9)}) ${digits.slice(
    -9,
    -4,
  )}-${digits.slice(-4)}`;
}

function syncCompanionNames(names: string[], companionsCount: number) {
  return Array.from({ length: companionsCount }, (_, index) => names[index] ?? "");
}

function validateForm(form: FormState) {
  const normalizedFullName = normalizeName(form.fullName);
  const normalizedPhone = normalizePhone(form.phone);
  const normalizedCompanionNames = form.companionNames.map(normalizeName);

  if (normalizedFullName.length < 3) {
    return "Informe o nome completo do responsavel da familia.";
  }

  if (normalizedPhone.length < 10 || normalizedPhone.length > 15) {
    return "Informe um telefone valido para contato e reentrada.";
  }

  if (form.companionsCount !== normalizedCompanionNames.length) {
    return "A quantidade de acompanhantes nao corresponde aos nomes informados.";
  }

  if (normalizedCompanionNames.some((name) => name.length < 3)) {
    return "Preencha o nome completo de cada acompanhante.";
  }

  const uniqueCompanionNames = new Set(normalizedCompanionNames.map((name) => name.toLowerCase()));
  if (uniqueCompanionNames.size !== normalizedCompanionNames.length) {
    return "Nao repita nomes na lista de acompanhantes.";
  }

  return null;
}

function buildSubmitPayload(form: FormState) {
  return {
    fullName: normalizeName(form.fullName),
    phone: normalizePhone(form.phone),
    companionsCount: form.companionsCount,
    companionNames: form.companionNames.map(normalizeName),
  };
}

function GuestOpenAccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("token");
  const [form, setForm] = useState<FormState>(INITIAL_FORM_STATE);
  const [status, setStatus] = useState<SubmitStatus>(inviteToken ? "token-loading" : "idle");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successPayload, setSuccessPayload] = useState<OpenGuestAccessRegistrationDto | null>(null);

  useEffect(() => {
    if (!inviteToken) {
      return;
    }

    let isMounted = true;

    async function loginWithInviteToken(token: string) {
      try {
        await authApi.loginWithToken(token);

        if (!isMounted) {
          return;
        }

        router.push("/guest/home");
      } catch {
        if (!isMounted) {
          return;
        }

        setStatus("idle");
        setServerError(
          "Nao foi possivel entrar por esse link. Se voce ja se cadastrou, use o codigo salvo para reentrar.",
        );
      }
    }

    void loginWithInviteToken(inviteToken);

    return () => {
      isMounted = false;
    };
  }, [inviteToken, router]);

  const isSubmitting = status === "submitting" || status === "token-loading";
  const isSuccess = status === "success";
  const companionFields = useMemo(
    () => syncCompanionNames(form.companionNames, form.companionsCount),
    [form.companionNames, form.companionsCount],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validateForm(form);
    if (validationError) {
      setFieldError(validationError);
      setServerError(null);
      setStatus("idle");
      return;
    }

    setFieldError(null);
    setServerError(null);
    setStatus("submitting");

    try {
      const result = await authApi.registerOpenAccess(buildSubmitPayload(form));
      window.localStorage.setItem(GUEST_ACCESS_CODE_STORAGE_KEY, result.shortCode);
      setSuccessPayload(result);
      setStatus("success");
    } catch (error) {
      const message =
        error instanceof Error && error.message === "Request could not be completed"
          ? "Nao foi possivel concluir o cadastro. Se este telefone ja foi usado, entre com o codigo salvo."
          : "Nao foi possivel concluir o cadastro agora.";
      setServerError(message);
      setStatus("error");
    }
  }

  return (
    <div className={styles.shell}>
      <header className={styles.topBar} aria-label="Navegacao do convidado">
        <a className={styles.brand} href="/guest/login">
          Wedding OS
        </a>
        <span className={styles.securePill}>Link unico</span>
      </header>

      <main className={styles.main}>
        <section className={styles.hero} aria-labelledby="guest-open-access-title">
          <p className={styles.eyebrow}>Convite da familia</p>
          <h1 id="guest-open-access-title">Cadastre quem vai com voce</h1>
          <p>
            Uma pessoa da familia deve preencher os dados abaixo, incluir os acompanhantes e guardar
            o codigo de acesso para reentradas futuras.
          </p>
        </section>

        <section
          className={`${styles.statusCard} ${isSuccess ? styles.successCard : ""} ${
            status === "error" ? styles.errorCard : ""
          }`}
          aria-live="polite"
          aria-busy={isSubmitting}
        >
          <div className={styles.statusVisual} aria-hidden="true">
            {isSubmitting ? <span className={styles.spinner} /> : null}
            {isSuccess ? <span className={styles.successMark} /> : null}
            {!isSubmitting && !isSuccess ? <span className={styles.inviteMark} /> : null}
          </div>

          <div className={styles.statusBody}>
            <span className={styles.statusLabel}>
              {isSuccess
                ? "Cadastro concluido"
                : isSubmitting
                  ? "Criando acesso"
                  : "Responsavel principal"}
            </span>
            <h2>
              {isSuccess
                ? "Seu acesso esta pronto"
                : isSubmitting
                  ? "Estamos preparando sua entrada"
                  : "Preencha os dados da familia"}
            </h2>
            <p>
              {isSuccess
                ? "Guarde o codigo exibido abaixo. Ele sera usado para entrar novamente em outro aparelho ou se sua sessao expirar."
                : "Use um telefone valido, porque ele identifica o cadastro principal desta familia."}
            </p>
          </div>

          {isSuccess && successPayload ? (
            <div className={styles.successPanel}>
              <div className={styles.codeBlock}>
                <span>Codigo de acesso</span>
                <strong>{successPayload.shortCode}</strong>
              </div>
              <div className={styles.successMeta}>
                <p>{successPayload.message}</p>
                <button
                  className={styles.primaryButton}
                  onClick={() => router.push("/guest/home")}
                  type="button"
                >
                  Continuar para o convite
                </button>
              </div>
            </div>
          ) : (
            <form className={styles.form} onSubmit={handleSubmit} noValidate>
              <div className={styles.fieldGroup}>
                <label className={styles.inputLabel} htmlFor="full-name">
                  Nome completo
                </label>
                <input
                  className={styles.textInput}
                  disabled={isSubmitting}
                  id="full-name"
                  name="fullName"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, fullName: event.target.value }))
                  }
                  placeholder="Ex: Carlos Azevedo"
                  type="text"
                  value={form.fullName}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.inputLabel} htmlFor="phone">
                  Telefone
                </label>
                <input
                  className={styles.textInput}
                  disabled={isSubmitting}
                  id="phone"
                  inputMode="tel"
                  name="phone"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      phone: formatPhoneInput(event.target.value),
                    }))
                  }
                  placeholder="(62) 99999-1111"
                  type="tel"
                  value={form.phone}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.inputLabel} htmlFor="companionsCount">
                  Quantidade de acompanhantes
                </label>
                <select
                  className={styles.textInput}
                  disabled={isSubmitting}
                  id="companionsCount"
                  name="companionsCount"
                  onChange={(event) => {
                    const companionsCount = Number(event.target.value);
                    setForm((current) => ({
                      ...current,
                      companionsCount,
                      companionNames: syncCompanionNames(current.companionNames, companionsCount),
                    }));
                  }}
                  value={form.companionsCount}
                >
                  {COMPANION_COUNT_OPTIONS.map((count) => (
                    <option key={count} value={count}>
                      {count}
                    </option>
                  ))}
                </select>
              </div>

              {companionFields.length > 0 ? (
                <div className={styles.companionsSection}>
                  <div className={styles.sectionTitle}>
                    <span>Nomes dos acompanhantes</span>
                  </div>
                  {companionFields.map((companionName, index) => (
                    <input
                      className={styles.textInput}
                      disabled={isSubmitting}
                      key={`companion-${index + 1}`}
                      onChange={(event) =>
                        setForm((current) => {
                          const companionNames = [...current.companionNames];
                          companionNames[index] = event.target.value;
                          return {
                            ...current,
                            companionNames,
                          };
                        })
                      }
                      placeholder={`Acompanhante ${index + 1}`}
                      type="text"
                      value={companionName}
                    />
                  ))}
                </div>
              ) : null}

              {fieldError ? <p className={styles.fieldError}>{fieldError}</p> : null}
              {serverError ? <p className={styles.fieldError}>{serverError}</p> : null}

              <button className={styles.primaryButton} disabled={isSubmitting} type="submit">
                {isSubmitting ? "Criando acesso..." : "Cadastrar familia"}
              </button>

              <a className={styles.secondaryButton} href="/guest/login/code">
                Ja tenho meu codigo
              </a>
            </form>
          )}
        </section>

        <aside className={styles.quoteCard} aria-label="Mensagem dos noivos">
          <span />
          <blockquote>
            "Queremos que a entrada seja simples, mas organizada para toda a familia."
          </blockquote>
          <cite>Alice &amp; Bruno</cite>
        </aside>
      </main>
    </div>
  );
}

function LoginFallback() {
  return (
    <div className={styles.shell}>
      <main className={styles.fallback}>
        <span className={styles.spinner} aria-hidden="true" />
        <p>Carregando acesso...</p>
      </main>
    </div>
  );
}

export default function GuestLoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <GuestOpenAccessContent />
    </Suspense>
  );
}
