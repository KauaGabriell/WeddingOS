"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { authApi } from "../../../lib/api";
import styles from "./page.module.css";

type LoginStatus = "idle" | "loading" | "success" | "error";

const statusCopy: Record<
  LoginStatus,
  {
    eyebrow: string;
    title: string;
    body: string;
  }
> = {
  idle: {
    eyebrow: "Convite digital",
    title: "Entre pelo link do seu convite",
    body: "Use o acesso enviado pelos noivos para abrir sua area de convidado com seguranca.",
  },
  loading: {
    eyebrow: "Validando acesso",
    title: "Estamos conferindo seu convite",
    body: "Isso leva poucos segundos. Mantenha esta tela aberta enquanto liberamos sua entrada.",
  },
  success: {
    eyebrow: "Acesso liberado",
    title: "Seu convite esta confirmado",
    body: "Vamos te levar para a sua area com RSVP, eventos, presentes e mural.",
  },
  error: {
    eyebrow: "Link indisponivel",
    title: "Nao foi possivel entrar por este link",
    body: "O convite pode ter expirado ou ja ter sido substituido. Use o codigo manual do convite.",
  },
};

function GuestLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<LoginStatus>(token ? "loading" : "idle");

  useEffect(() => {
    if (!token) {
      setStatus("idle");
      return;
    }

    let redirectTimer: ReturnType<typeof setTimeout> | undefined;
    let isMounted = true;

    async function loginWithInviteToken(inviteToken: string) {
      setStatus("loading");

      try {
        await authApi.loginWithToken(inviteToken);

        if (!isMounted) {
          return;
        }

        setStatus("success");
        redirectTimer = setTimeout(() => {
          router.push("/guest/home");
        }, 1200);
      } catch {
        if (isMounted) {
          setStatus("error");
        }
      }
    }

    void loginWithInviteToken(token);

    return () => {
      isMounted = false;
      if (redirectTimer) {
        clearTimeout(redirectTimer);
      }
    };
  }, [router, token]);

  const copy = statusCopy[status];
  const isLoading = status === "loading";
  const isSuccess = status === "success";
  const isError = status === "error";

  return (
    <div className={styles.shell}>
      <header className={styles.topBar} aria-label="Navegacao do login do convidado">
        <a className={styles.brand} href="/guest/login">
          Wedding OS
        </a>
        <span className={styles.securePill}>Acesso seguro</span>
      </header>

      <main className={styles.main}>
        <section className={styles.hero} aria-labelledby="guest-login-title">
          <p className={styles.eyebrow}>{copy.eyebrow}</p>
          <h1 id="guest-login-title">{copy.title}</h1>
          <p>{copy.body}</p>
        </section>

        <section
          className={`${styles.statusCard} ${isSuccess ? styles.successCard : ""} ${
            isError ? styles.errorCard : ""
          }`}
          aria-live="polite"
          aria-busy={isLoading}
        >
          <div className={styles.statusVisual} aria-hidden="true">
            {isLoading ? <span className={styles.spinner} /> : null}
            {isSuccess ? <span className={styles.successMark} /> : null}
            {isError ? <span className={styles.errorMark} /> : null}
            {status === "idle" ? <span className={styles.inviteMark} /> : null}
          </div>

          <div className={styles.statusBody}>
            <span className={styles.statusLabel}>
              {isLoading
                ? "Conectando"
                : isSuccess
                  ? "Tudo certo"
                  : isError
                    ? "Acesso negado"
                    : "Aguardando link"}
            </span>
            <h2>
              {isLoading
                ? "Validacao em andamento"
                : isSuccess
                  ? "Entrada autorizada"
                  : isError
                    ? "Link invalido ou expirado"
                    : "Abra seu convite digital"}
            </h2>
            <p>
              {isLoading
                ? "Se o convite estiver valido, voce sera redirecionado automaticamente."
                : isSuccess
                  ? "Redirecionando para o inicio do convidado."
                  : isError
                    ? "Por seguranca, nao exibimos detalhes sobre o motivo da falha."
                    : "O link enviado pelos noivos contem o token necessario para entrar."}
            </p>
          </div>

          <div className={styles.actionGroup}>
            {isError || status === "idle" ? (
              <a className={styles.primaryButton} href="/guest/login/code">
                Entrar com codigo
              </a>
            ) : null}
            {isError ? (
              <a className={styles.secondaryButton} href="/guest/login">
                Tentar outro link
              </a>
            ) : null}
          </div>
        </section>

        <aside className={styles.quoteCard} aria-label="Mensagem dos noivos">
          <span />
          <blockquote>
            "Cada detalhe foi preparado para receber voce perto da nossa historia."
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
        <p>Carregando convite...</p>
      </main>
    </div>
  );
}

export default function GuestLoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <GuestLoginContent />
    </Suspense>
  );
}
