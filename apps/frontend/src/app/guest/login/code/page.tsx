"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { authApi } from "../../../../lib/api";
import styles from "./page.module.css";

type SubmitStatus = "idle" | "submitting" | "success" | "error";

const MIN_CODE_LENGTH = 4;
const MAX_CODE_LENGTH = 32;

function normalizeCode(value: string) {
  return value.trim().toUpperCase();
}

function validateCode(code: string) {
  if (!code) {
    return "Informe o codigo do convite.";
  }

  if (code.length < MIN_CODE_LENGTH) {
    return "O codigo deve ter pelo menos 4 caracteres.";
  }

  if (code.length > MAX_CODE_LENGTH) {
    return "O codigo deve ter no maximo 32 caracteres.";
  }

  return null;
}

export default function GuestCodeLoginPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [fieldError, setFieldError] = useState<string | null>(null);

  const isSubmitting = status === "submitting";
  const isSuccess = status === "success";
  const isError = status === "error";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedCode = normalizeCode(code);
    const validationError = validateCode(normalizedCode);

    setCode(normalizedCode);

    if (validationError) {
      setFieldError(validationError);
      setStatus("idle");
      return;
    }

    setFieldError(null);
    setStatus("submitting");

    try {
      await authApi.loginWithCode(normalizedCode);
      setStatus("success");

      window.setTimeout(() => {
        router.push("/guest/home");
      }, 1200);
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className={styles.shell}>
      <header className={styles.topBar} aria-label="Navegacao do login por codigo">
        <a className={styles.brand} href="/guest/login">
          Wedding OS
        </a>
        <span className={styles.securePill}>Codigo seguro</span>
      </header>

      <main className={styles.main}>
        <section className={styles.hero} aria-labelledby="guest-code-login-title">
          <p className={styles.eyebrow}>Acesso manual</p>
          <h1 id="guest-code-login-title">Entre com o codigo do convite</h1>
          <p>Use o codigo curto enviado pelos noivos para acessar sua area de convidado.</p>
        </section>

        <section
          className={`${styles.loginCard} ${isSuccess ? styles.successCard : ""} ${
            isError ? styles.errorCard : ""
          }`}
          aria-live="polite"
          aria-busy={isSubmitting}
        >
          <div className={styles.statusVisual} aria-hidden="true">
            {isSubmitting ? <span className={styles.spinner} /> : null}
            {isSuccess ? <span className={styles.successMark} /> : null}
            {isError ? <span className={styles.errorMark} /> : null}
            {status === "idle" ? <span className={styles.codeMark} /> : null}
          </div>

          <div className={styles.statusBody}>
            <span className={styles.statusLabel}>
              {isSubmitting
                ? "Validando"
                : isSuccess
                  ? "Tudo certo"
                  : isError
                    ? "Acesso negado"
                    : "Codigo do convite"}
            </span>
            <h2>
              {isSubmitting
                ? "Conferindo o codigo"
                : isSuccess
                  ? "Entrada autorizada"
                  : isError
                    ? "Nao foi possivel entrar"
                    : "Digite seu codigo"}
            </h2>
            <p>
              {isSubmitting
                ? "Se o codigo estiver valido, voce sera redirecionado automaticamente."
                : isSuccess
                  ? "Redirecionando para o inicio do convidado."
                  : isError
                    ? "Confira o codigo no convite. Por seguranca, nao exibimos detalhes sobre a falha."
                    : "O codigo fica no convite digital e pode conter letras e numeros."}
            </p>
          </div>

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <label className={styles.inputLabel} htmlFor="guest-code">
              Codigo de acesso
            </label>
            <input
              aria-describedby={fieldError ? "guest-code-error" : "guest-code-hint"}
              aria-invalid={fieldError ? "true" : "false"}
              autoCapitalize="characters"
              autoComplete="one-time-code"
              className={styles.codeInput}
              disabled={isSubmitting || isSuccess}
              id="guest-code"
              inputMode="text"
              maxLength={MAX_CODE_LENGTH}
              name="code"
              onChange={(event) => {
                setCode(event.target.value.toUpperCase());
                if (fieldError) {
                  setFieldError(null);
                }
                if (status === "error") {
                  setStatus("idle");
                }
              }}
              placeholder="EX: CODE123"
              type="text"
              value={code}
            />
            {fieldError ? (
              <p className={styles.fieldError} id="guest-code-error" role="alert">
                {fieldError}
              </p>
            ) : (
              <p className={styles.inputHint} id="guest-code-hint">
                Minimo 4 caracteres. Use exatamente como aparece no convite.
              </p>
            )}

            <button
              className={styles.primaryButton}
              disabled={isSubmitting || isSuccess}
              type="submit"
            >
              {isSubmitting ? "Validando..." : isSuccess ? "Acesso liberado" : "Entrar"}
            </button>
          </form>

          <a className={styles.secondaryButton} href="/guest/login">
            Usar link do convite
          </a>
        </section>
      </main>
    </div>
  );
}
