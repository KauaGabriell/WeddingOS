"use client";

import { useMemo, useState } from "react";
import { GuestBottomNav } from "../../../components/guest-bottom-nav/guest-bottom-nav";
import { MobileTopBar } from "../../../components/mobile-top-bar/mobile-top-bar";
import { ApiRequestError, guestApi } from "../../../lib/api";
import styles from "./page.module.css";

type SubmitState = "idle" | "submitting" | "success" | "error";

// Tipos aceitos para SELEÇÃO. Mantemos image/* no accept do input para que o
// celular ofereça câmera + galeria + HEIC. A compressão converte tudo p/ JPEG.
const SELECTABLE_IMAGE_PATTERN = /^image\//;

// Limites da pipeline de compressão.
const MAX_IMAGE_DIMENSION = 1920; // maior lado em pixels
const COMPRESSION_QUALITY = 0.85; // JPEG quality

// Tamanho máximo aceito ANTES de comprimir. Evita carregar 80MB na memória.
const MAX_RAW_BYTES = 25 * 1024 * 1024;

// Tamanho final teto (alinhado com o backend = 10MB).
const MAX_COMPRESSED_BYTES = 25 * 1024 * 1024;

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

    if (!SELECTABLE_IMAGE_PATTERN.test(file.type) && file.type !== "") {
      // file.type pode vir vazio em alguns navegadores; nesse caso confiamos
      // na compressão para resolver. Se for declaradamente não-imagem, paramos.
      setSubmitState("error");
      setFeedback("Selecione um arquivo de imagem.");
      return;
    }

    if (file.size > MAX_RAW_BYTES) {
      setSubmitState("error");
      setFeedback("Imagem muito pesada para o navegador processar. Tente uma foto menor.");
      return;
    }

    setSubmitState("submitting");
    setFeedback("Preparando foto...");
    setResultUrl(null);

    try {
      // 1) Comprime e re-codifica como JPEG (resolve EXIF, HEIC, fotos enormes
      // de câmera, e o limite de body do Fastify).
      const compressed = await compressImageToJpeg(file);

      if (compressed.file.size > MAX_COMPRESSED_BYTES) {
        setSubmitState("error");
        setFeedback("Não foi possível reduzir o tamanho da foto. Tente outra imagem.");
        return;
      }

      setFeedback("Enviando foto...");

      // 2) Converte para base64 (sem o prefixo data:) para o JSON.
      const fileBodyBase64 = await fileToBase64(compressed.file);

      // 3) Envia. mediaSizeBytes/mediaMimeType/fileName devem refletir o
      // arquivo COMPRIMIDO, porque é o que está dentro de fileBodyBase64.
      const result = await guestApi.createPhotoPost({
        authorName: authorName.trim(),
        message: message.trim() || "-",
        fileName: compressed.file.name,
        fileBodyBase64,
        mediaMimeType: compressed.file.type,
        mediaSizeBytes: compressed.file.size,
        mediaWidth: compressed.width,
        mediaHeight: compressed.height,
      });

      setSubmitState("success");
      setFeedback("Upload recebido. Sua foto entrou na fila de moderação.");
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
      <MobileTopBar
        variant="guest"
        brandHref="/guest/home"
        avatarSrc="/guest-home/profile-avatar.jpg"
      />

      <main className={styles.main}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>Mural de Fotos</p>
          <h1>Enviar Foto</h1>
          <p>Compartilhe um momento especial com os noivos e deixe um recado no mural.</p>
        </section>

        <form className={styles.formCard} onSubmit={handleSubmit}>
          <label className={styles.fieldLabel} htmlFor="authorName">
            Nome para exibição
          </label>
          <input
            id="authorName"
            className={styles.input}
            value={authorName}
            maxLength={120}
            onChange={(event) => setAuthorName(event.target.value)}
            placeholder="Ex.: Família Azevedo"
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
            Foto (qualquer formato — JPG, PNG, HEIC)
          </label>
          {/* Aceitamos image/* no input para que o celular ofereça câmera +
              galeria. A compressão padroniza tudo em JPEG no envio. */}
          <input
            id="photoFile"
            className={styles.fileInput}
            type="file"
            accept="image/*"
            onChange={(event) => handleSelectFile(event.target.files?.[0] ?? null)}
          />

          {previewUrl ? (
            <figure className={styles.previewCard}>
              <img src={previewUrl} alt="Pré-visualização da foto selecionada" />
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
  if (error instanceof ImageProcessingError) {
    return error.userMessage;
  }

  if (!(error instanceof ApiRequestError)) {
    return "Não foi possível enviar agora. Tente novamente em instantes.";
  }

  if (error.status === 401) {
    return "Sua sessão expirou. Entre novamente para enviar foto.";
  }

  if (error.code === "FILE_TOO_LARGE") {
    return "Arquivo muito grande. Selecione uma imagem menor.";
  }

  if (error.code === "UNSUPPORTED_MEDIA_TYPE" || error.code === "UNSUPPORTED_FILE_EXTENSION") {
    return "Formato inválido. Use apenas JPG ou PNG.";
  }

  if (error.code === "MEDIA_TYPE_EXTENSION_MISMATCH") {
    return "Tipo de arquivo inconsistente. Revise a imagem e tente de novo.";
  }

  if (error.status === 413) {
    return "A foto ainda está muito grande. Tente outra imagem.";
  }

  if (error.status === 403 || error.status === 404) {
    return "Seu acesso não permite envio agora. Entre novamente para continuar.";
  }

  return "Não foi possível enviar agora. Tente novamente em instantes.";
}

class ImageProcessingError extends Error {
  readonly userMessage: string;

  constructor(userMessage: string, cause?: unknown) {
    super(userMessage);
    this.userMessage = userMessage;
    if (cause !== undefined) {
      (this as unknown as { cause: unknown }).cause = cause;
    }
  }
}

interface CompressedImage {
  readonly file: File;
  readonly width: number;
  readonly height: number;
}

/**
 * Carrega a imagem (com EXIF orientation aplicado quando suportado),
 * redimensiona se necessário e re-codifica como JPEG.
 *
 * Resolve três problemas reais:
 *   1) Fotos de câmera (3-12MB) que estouram o bodyLimit do Fastify.
 *   2) HEIC/HEIF do iOS — convertido para JPEG quando o navegador decodifica.
 *   3) Rotação EXIF (foto retrato deitada após re-encode em canvas).
 */
async function compressImageToJpeg(originalFile: File): Promise<CompressedImage> {
  let drawable: CanvasImageSource & { close?: () => void };
  let sourceWidth: number;
  let sourceHeight: number;

  try {
    if (typeof createImageBitmap === "function") {
      // Caminho preferido: createImageBitmap respeita EXIF orientation
      // quando passamos imageOrientation: "from-image".
      const bitmap = await createImageBitmap(originalFile, {
        imageOrientation: "from-image",
      });
      drawable = bitmap;
      sourceWidth = bitmap.width;
      sourceHeight = bitmap.height;
    } else {
      const fallback = await loadHtmlImage(originalFile);
      drawable = fallback;
      sourceWidth = fallback.naturalWidth;
      sourceHeight = fallback.naturalHeight;
    }
  } catch (error) {
    // Pode acontecer com HEIC em navegadores sem suporte nativo (Android/Chrome
    // não decodifica HEIC). Tentamos o fallback antes de desistir.
    try {
      const fallback = await loadHtmlImage(originalFile);
      drawable = fallback;
      sourceWidth = fallback.naturalWidth;
      sourceHeight = fallback.naturalHeight;
    } catch {
      throw new ImageProcessingError(
        "Não foi possível ler essa imagem. Tente outro arquivo (JPG ou PNG).",
        error,
      );
    }
  }

  if (!sourceWidth || !sourceHeight) {
    drawable.close?.();
    throw new ImageProcessingError("Imagem inválida. Tente outro arquivo.");
  }

  let targetWidth = sourceWidth;
  let targetHeight = sourceHeight;

  if (sourceWidth > MAX_IMAGE_DIMENSION || sourceHeight > MAX_IMAGE_DIMENSION) {
    const ratio = Math.min(
      MAX_IMAGE_DIMENSION / sourceWidth,
      MAX_IMAGE_DIMENSION / sourceHeight,
    );
    targetWidth = Math.max(1, Math.round(sourceWidth * ratio));
    targetHeight = Math.max(1, Math.round(sourceHeight * ratio));
  }

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    drawable.close?.();
    throw new ImageProcessingError(
      "Seu navegador não conseguiu processar a imagem. Tente outro navegador.",
    );
  }

  // Fundo branco para PNGs com transparência (já que o destino é JPEG).
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, targetWidth, targetHeight);
  ctx.drawImage(drawable, 0, 0, targetWidth, targetHeight);
  drawable.close?.();

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), "image/jpeg", COMPRESSION_QUALITY);
  });

  if (!blob) {
    throw new ImageProcessingError(
      "Não foi possível comprimir a foto. Tente outra imagem.",
    );
  }

  const baseName =
    originalFile.name.replace(/\.[^/.]+$/, "").trim() || "photo";
  // Garante extensão .jpg pareada com mediaMimeType=image/jpeg, atendendo a
  // validação do backend (media_type_extension_mismatch).
  const compressedFile = new File([blob], `${baseName}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });

  return {
    file: compressedFile,
    width: targetWidth,
    height: targetHeight,
  };
}

async function loadHtmlImage(file: File): Promise<HTMLImageElement> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("image_load_failed"));
      img.src = objectUrl;
    });
    return image;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = typeof reader.result === "string" ? reader.result : "";
      const commaIndex = value.indexOf(",");
      const base64 = commaIndex >= 0 ? value.slice(commaIndex + 1) : "";

      if (!base64) {
        reject(new ImageProcessingError("Falha ao ler a foto. Tente novamente."));
        return;
      }

      resolve(base64);
    };
    reader.onerror = () =>
      reject(
        new ImageProcessingError(
          "Falha ao ler a foto. Tente novamente.",
          reader.error,
        ),
      );
    reader.readAsDataURL(file);
  });
}
