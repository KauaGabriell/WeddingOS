"use client";

import { useMemo, useState } from "react";
import { GuestBottomNav } from "../../../components/guest-bottom-nav/guest-bottom-nav";
import { ApiRequestError, guestApi } from "../../../lib/api";
import styles from "./page.module.css";

type SubmitState = "idle" | "submitting" | "success" | "error";

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png"];

export default function NewPhotoPostPage() {
  const [authorName, setAuthorName] = useState("");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [feedback, setFeedback] = useState("Adicione sua foto e recado para publicar no mural.");
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return submitState !== "submitting" && file !== null;
  }, [file, submitState]);

  function handleSelectFile(nextFile: File | null) {
    setFile(nextFile);
    setSubmitState("idle");
    setResultUrl(null);

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }

    if (!nextFile) {
      return;
    }

    const objectUrl = URL.createObjectURL(nextFile);
    setPreviewUrl(objectUrl);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authorName.trim()) {
      setSubmitState("error");
      setFeedback("Informe seu nome para enviar a foto.");
      return;
    }

    if (!file) {
      setSubmitState("error");
      setFeedback("Selecione uma imagem para continuar.");
      return;
    }

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setSubmitState("error");
      setFeedback("Use apenas arquivos JPG ou PNG.");
      return;
    }

    setSubmitState("submitting");
    setFeedback("Enviando foto...");
    setResultUrl(null);

    try {
      const fileBodyBase64 = await toBase64(file);
      const dimensions = await readImageDimensions(file);
      const result = await guestApi.createPhotoPost({
        authorName: authorName.trim(),
        message: message.trim() || "-",
        fileName: file.name,
        fileBodyBase64,
        mediaMimeType: file.type,
        mediaSizeBytes: file.size,
        mediaWidth: dimensions?.width,
        mediaHeight: dimensions?.height,
      });

      setSubmitState("success");
      setFeedback("Upload recebido. Sua foto entrou na fila de moderacao.");
      setResultUrl(result.mediaUrl);
      setAuthorName("");
      setMessage("");
      handleSelectFile(null);
    } catch (error) {
      setSubmitState("error");
      setResultUrl(null);
      setFeedback(resolveUploadError(error));
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
        <a className={styles.backLink} href="/photo-wall">
          Voltar
        </a>
      </header>

      <main className={styles.main}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>Mural de Fotos</p>
          <h1>Enviar Foto</h1>
          <p>Compartilhe um momento especial com os noivos e deixe um recado no mural.</p>
        </section>

        <form className={styles.formCard} onSubmit={handleSubmit}>
          <label className={styles.fieldLabel} htmlFor="authorName">
            Nome para exibicao
          </label>
          <input
            id="authorName"
            className={styles.input}
            value={authorName}
            maxLength={120}
            onChange={(event) => setAuthorName(event.target.value)}
            placeholder="Ex.: Familia Azevedo"
          />

          <label className={styles.fieldLabel} htmlFor="message">
            Recado (opcional)
          </label>
          <textarea
            id="message"
            className={styles.textarea}
            value={message}
            maxLength={1000}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Escreva sua mensagem para os noivos..."
          />

          <label className={styles.fieldLabel} htmlFor="photoFile">
            Foto (JPG ou PNG)
          </label>
          <input
            id="photoFile"
            className={styles.fileInput}
            type="file"
            accept=".jpg,.jpeg,.png,image/jpeg,image/png"
            onChange={(event) => handleSelectFile(event.target.files?.[0] ?? null)}
          />

          {previewUrl ? (
            <figure className={styles.previewCard}>
              <img src={previewUrl} alt="Pre-visualizacao da foto selecionada" />
            </figure>
          ) : null}

          <button className={styles.cta} type="submit" disabled={!canSubmit}>
            {submitState === "submitting" ? "ENVIANDO..." : "ENVIAR FOTO"}
          </button>

          <p className={styles.feedback} data-state={submitState}>
            {feedback}
          </p>

          {resultUrl ? (
            <p className={styles.successLink}>
              Upload salvo com sucesso. <a href={resultUrl}>Visualizar imagem assinada</a>
            </p>
          ) : null}
        </form>
      </main>

      <GuestBottomNav activeTab="wall" />
    </div>
  );
}

function resolveUploadError(error: unknown): string {
  if (!(error instanceof ApiRequestError)) {
    return "Nao foi possivel enviar agora. Tente novamente em instantes.";
  }

  if (error.status === 401) {
    return "Sua sessao expirou. Entre novamente para enviar foto.";
  }

  if (error.code === "FILE_TOO_LARGE") {
    return "Arquivo muito grande. Selecione uma imagem menor.";
  }

  if (error.code === "UNSUPPORTED_MEDIA_TYPE" || error.code === "UNSUPPORTED_FILE_EXTENSION") {
    return "Formato invalido. Use apenas JPG ou PNG.";
  }

  if (error.code === "MEDIA_TYPE_EXTENSION_MISMATCH") {
    return "Tipo de arquivo inconsistente. Revise a imagem e tente de novo.";
  }

  if (error.status === 403 || error.status === 404) {
    return "Seu acesso nao permite envio agora. Entre novamente para continuar.";
  }

  return "Nao foi possivel enviar agora. Tente novamente em instantes.";
}

async function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = typeof reader.result === "string" ? reader.result : "";
      const [, base64] = value.split(",", 2);

      if (!base64) {
        reject(new Error("invalid_base64"));
        return;
      }

      resolve(base64);
    };
    reader.onerror = () => reject(reader.error ?? new Error("read_failed"));
    reader.readAsDataURL(file);
  });
}

async function readImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("invalid_data_url"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("read_failed"));
    reader.readAsDataURL(file);
  });

  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      resolve(null);
    };
    image.src = dataUrl;
  });
}
