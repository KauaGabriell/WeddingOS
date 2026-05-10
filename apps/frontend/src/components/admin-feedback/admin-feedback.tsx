import styles from "./admin-feedback.module.css";

type AdminFeedbackProps = {
  actionHref?: string;
  actionLabel?: string;
  body: string;
  title: string;
  variant: "loading" | "error" | "empty";
};

export function AdminFeedback({
  actionHref,
  actionLabel,
  body,
  title,
  variant,
}: AdminFeedbackProps) {
  const eyebrow =
    variant === "loading" ? "Carregando" : variant === "error" ? "Falha de acesso" : "Sem dados";

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
