import styles from "./public-feedback.module.css";

type PublicFeedbackProps = {
  actionHref?: string;
  actionLabel?: string;
  body: string;
  title: string;
  variant: "empty" | "error" | "loading";
};

export function PublicFeedback({
  actionHref,
  actionLabel,
  body,
  title,
  variant,
}: PublicFeedbackProps) {
  const eyebrow =
    variant === "loading" ? "Carregando" : variant === "error" ? "Erro de conexao" : "Sem dados";

  return (
    <section className={styles.card} aria-live="polite">
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.body}>{body}</p>
      {actionHref && actionLabel ? (
        <a className={styles.action} href={actionHref}>
          {actionLabel}
        </a>
      ) : null}
    </section>
  );
}
