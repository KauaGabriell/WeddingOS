"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ADMIN_SESSION_TOKEN_STORAGE_KEY,
  ADMIN_USER_ID_STORAGE_KEY,
  ApiRequestError,
  authApi,
} from "../../../lib/api";
import styles from "./page.module.css";

type LoginState = "idle" | "requesting" | "requested" | "verifying" | "authenticated" | "error";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [state, setState] = useState<LoginState>("idle");
  const [feedback, setFeedback] = useState<string | null>(null);

  const normalizedEmail = email.trim().toLowerCase();
  const canRequest = useMemo(() => normalizedEmail.length >= 5, [normalizedEmail]);
  const canVerify = useMemo(() => /^\d{8}$/.test(code.trim()), [code]);

  async function handleRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canRequest) {
      setState("error");
      setFeedback("Informe um email valido.");
      return;
    }

    setState("requesting");
    setFeedback(null);

    try {
      await authApi.requestAdminLogin(normalizedEmail);
      setState("requested");
      setFeedback("Solicitacao recebida. Informe o codigo de acesso para entrar.");
    } catch {
      setState("error");
      setFeedback("Nao foi possivel solicitar o codigo agora.");
    }
  }

  async function handleVerify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canVerify) {
      setState("error");
      setFeedback("Informe um codigo valido de 8 digitos.");
      return;
    }

    setState("verifying");
    setFeedback(null);

    try {
      const session = await authApi.verifyAdminLoginCode({
        email: normalizedEmail,
        code: code.trim(),
      });
      window.localStorage.setItem(ADMIN_SESSION_TOKEN_STORAGE_KEY, session.accessToken);
      window.localStorage.setItem(ADMIN_USER_ID_STORAGE_KEY, session.actorId);
      setState("authenticated");
      setFeedback("Login concluido. Redirecionando...");
      router.push("/admin/dashboard");
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401) {
        setFeedback("Codigo invalido ou expirado.");
      } else {
        setFeedback("Nao foi possivel validar o codigo agora.");
      }
      setState("error");
    }
  }

  return (
    <div className={styles.shell}>
      <header className={styles.topBar}>
        <div className={styles.brandGroup}>
          <span className={styles.menuMark} aria-hidden="true" />
          <span className={styles.brand}>Wedding OS</span>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>Acesso administrativo</p>
          <h1>Entrar no Painel</h1>
        </section>

        <section className={styles.card}>
          <h2>1. Solicitar codigo</h2>
          <form onSubmit={handleRequest} className={styles.form}>
            <label htmlFor="admin-email">Email</label>
            <input
              id="admin-email"
              type="email"
              placeholder="admin@exemplo.com"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <button type="submit" disabled={!canRequest || state === "requesting"}>
              {state === "requesting" ? "Enviando..." : "Enviar Codigo"}
            </button>
          </form>
        </section>

        <section className={styles.card}>
          <h2>2. Confirmar codigo</h2>
          <form onSubmit={handleVerify} className={styles.form}>
            <label htmlFor="admin-code">Codigo de acesso</label>
            <input
              id="admin-code"
              type="text"
              inputMode="numeric"
              maxLength={8}
              placeholder="11031105"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
            />
            <button
              type="submit"
              disabled={!canVerify || state === "verifying" || normalizedEmail.length === 0}
            >
              {state === "verifying" ? "Validando..." : "Entrar"}
            </button>
          </form>
        </section>

        {feedback ? <p className={styles.feedback}>{feedback}</p> : null}
      </main>
    </div>
  );
}
