import React, { useEffect, useRef, useState } from "react";
import {
  Camera,
  CameraOff,
  Check,
  SwitchCamera,
  Loader2,
  RotateCcw,
  Upload,
} from "lucide-react";
import Modal from "./Modal";
import { Button } from "../ui/button";

export interface CameraCaptureModalProps {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
  title?: string;
}

export default function CameraCaptureModal({
  open,
  onClose,
  onCapture,
  title = "Tirar Foto do Comprovativo",
}: CameraCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fallbackInputRef = useRef<HTMLInputElement>(null);

  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isLoadingCamera, setIsLoadingCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">(
    "environment"
  );

  // Iniciar câmara ao abrir o modal ou ao alternar entre frontal e traseira
  useEffect(() => {
    if (open) {
      setCapturedImage(null);
      startCamera(facingMode);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [open, facingMode]);

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  async function startCamera(mode: "environment" | "user") {
    stopCamera();
    setIsLoadingCamera(true);
    setCameraError(null);

    if (!navigator?.mediaDevices?.getUserMedia) {
      setIsLoadingCamera(false);
      setCameraError(
        !window.isSecureContext
          ? "O navegador requer HTTPS (certificado SSL) para ligar a câmara diretamente nesta janela. Clique abaixo para abrir logo a app da câmara do telemóvel sem restrições."
          : "O seu navegador não suporta captura direta por câmara. Use a câmara nativa do dispositivo abaixo."
      );
      return;
    }

    try {
      // 1ª tentativa: com modo ideal e orientação vertical (portrait) para documentos A4
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1080 },
            height: { ideal: 1920 },
          },
          audio: false,
        });
      } catch {
        // 2ª tentativa: fallback para qualquer vídeo disponível
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setIsLoadingCamera(false);
    } catch (err: any) {
      console.warn("Camera access failed:", err);
      setIsLoadingCamera(false);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCameraError(
          "Permissão recusada no navegador. Permita o acesso à câmara no ícone de permissões da barra de endereços."
        );
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setCameraError(
          "Nenhuma webcam detetada neste computador. Num telemóvel ou tablet, a câmara abrirá nativamente com alta resolução."
        );
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        setCameraError(
          "A câmara já está a ser utilizada por outra aplicação no computador (ex.: Teams, Zoom, Discord)."
        );
      } else {
        setCameraError(
          "Não foi possível ligar a câmara diretamente neste browser. Pode usar o botão abaixo."
        );
      }
    }
  }

  function handleSwitchCamera() {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  }

  function handleTakePhoto() {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const vWidth = video.videoWidth || 1280;
    const vHeight = video.videoHeight || 720;

    // Enquadramento vertical (proporção 3:4) para coincidir com o enquadramento exibido no ecrã
    const targetRatio = 3 / 4;
    let sWidth = vWidth;
    let sHeight = vHeight;
    let sx = 0;
    let sy = 0;

    if (vWidth / vHeight > targetRatio) {
      // Vídeo é mais largo (ex: webcam de computador 16:9 ou 4:3 landscape):
      // corta as laterais para obter exatamente o enquadramento vertical focado
      sWidth = Math.round(vHeight * targetRatio);
      sx = Math.round((vWidth - sWidth) / 2);
    } else {
      // Vídeo é mais alto do que 3:4: recorta topo e fundo centralmente
      sHeight = Math.round(vWidth / targetRatio);
      sy = Math.round((vHeight - sHeight) / 2);
    }

    const canvas = document.createElement("canvas");
    canvas.width = sWidth;
    canvas.height = sHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Se for câmara frontal, espelha para o utilizador ver natural
    if (facingMode === "user") {
      ctx.translate(sWidth, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setCapturedImage(dataUrl);
    stopCamera();
  }

  function handleRetake() {
    setCapturedImage(null);
    startCamera(facingMode);
  }

  async function handleConfirmPhoto() {
    if (!capturedImage) return;
    try {
      const res = await fetch(capturedImage);
      const blob = await res.blob();
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(
        now.getDate()
      )}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      const file = new File([blob], `comprovativo_${dateStr}.jpg`, {
        type: "image/jpeg",
      });
      onCapture(file);
      handleClose();
    } catch (e) {
      console.error("Failed to convert captured photo to File:", e);
    }
  }

  function handleFallbackFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      onCapture(file);
      handleClose();
    }
  }

  function handleClose() {
    stopCamera();
    setCapturedImage(null);
    setCameraError(null);
    onClose();
  }

  if (!open) return null;

  return (
    <Modal
      title={title}
      subtitle="Fotografe a sua baixa ou declaração médica"
      onClose={handleClose}
      maxWidth="max-w-md"
      footer={
        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2.5 w-full">
          {/* Input nativo com capture para telemóveis como alternativa imediata */}
          <input
            ref={fallbackInputRef}
            type="file"
            accept="image/*"
            capture={facingMode}
            className="hidden"
            onChange={handleFallbackFile}
          />

          {/* Ações Secundárias: Cancelar e Câmara do Telemóvel / Galeria */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClose}
              className="text-xs flex-1 sm:flex-initial cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fallbackInputRef.current?.click()}
              className="text-xs gap-1.5 flex-1 sm:flex-initial cursor-pointer text-muted-foreground hover:text-foreground"
              title="Abrir a câmara do telemóvel ou selecionar da galeria"
            >
              <Upload size={13} />
              <span className="truncate">Câmara / Ficheiro</span>
            </Button>
          </div>

          {/* Ação Primária */}
          <div className="w-full sm:w-auto flex items-center gap-2">
            {capturedImage ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRetake}
                  className="text-xs gap-1.5 flex-1 sm:flex-initial cursor-pointer"
                >
                  <RotateCcw size={13} />
                  <span>Repetir</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleConfirmPhoto}
                  className="text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 flex-1 sm:flex-initial cursor-pointer shadow-xs"
                >
                  <Check size={14} />
                  <span>Usar Foto</span>
                </Button>
              </>
            ) : cameraError ? (
              <Button
                type="button"
                size="sm"
                onClick={() => fallbackInputRef.current?.click()}
                className="text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto cursor-pointer shadow-xs"
              >
                <Upload size={13} />
                <span>Usar Câmara do Dispositivo</span>
              </Button>
            ) : (
              <Button
                type="button"
                disabled={isLoadingCamera}
                onClick={handleTakePhoto}
                className="text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto cursor-pointer shadow-xs"
              >
                <Camera size={14} />
                <span>Capturar Foto</span>
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-3">
        {/* Visualizador da Câmara ou Preview da Foto (Enquadramento Vertical / Portrait 3:4) */}
        <div className="relative w-full max-w-xs sm:max-w-sm mx-auto aspect-[3/4] max-h-[56vh] bg-black/95 rounded-xl overflow-hidden flex items-center justify-center border border-border shadow-inner">
          {capturedImage ? (
            <img
              src={capturedImage}
              alt="Foto capturada"
              className="w-full h-full object-contain"
            />
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                className={`w-full h-full object-cover ${
                  facingMode === "user" ? "scale-x-[-1]" : ""
                }`}
              />

              {isLoadingCamera && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white gap-2 z-10">
                  <Loader2 size={28} className="animate-spin text-primary" />
                  <p className="text-xs">A ligar a câmara...</p>
                </div>
              )}

              {cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-black/80 text-white gap-3 z-10">
                  <CameraOff size={32} className="text-destructive" />
                  <p className="text-xs text-muted-foreground max-w-sm">
                    {cameraError}
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => fallbackInputRef.current?.click()}
                    className="text-xs gap-1.5 mt-1"
                  >
                    <Upload size={13} />
                    <span>Abrir Câmara do Dispositivo</span>
                  </Button>
                </div>
              )}

              {/* Botão Visível para alternar entre câmara Traseira e Frontal */}
              {!isLoadingCamera && !cameraError && (
                <button
                  type="button"
                  onClick={handleSwitchCamera}
                  className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/70 hover:bg-black/90 text-white text-xs font-medium backdrop-blur-md border border-white/25 shadow-lg transition-all cursor-pointer z-20 active:scale-95"
                  title="Alternar entre câmara traseira e câmara frontal"
                >
                  <SwitchCamera size={14} className="text-primary shrink-0" />
                  <span>{facingMode === "environment" ? "Traseira" : "Frontal"}</span>
                </button>
              )}

              {/* Guia visual de enquadramento de documento na vertical */}
              {!isLoadingCamera && !cameraError && (
                <div className="absolute inset-4 pointer-events-none border-2 border-white/30 rounded-lg border-dashed flex items-end justify-center pb-2.5">
                  <span className="text-[10px] text-white/80 bg-black/60 px-2.5 py-1 rounded-md backdrop-blur-xs font-mono shadow-sm">
                    Enquadre o documento na vertical
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {capturedImage && (
          <p className="text-center text-xs text-emerald-600 font-medium flex items-center justify-center gap-1">
            <Check size={14} /> Foto capturada com sucesso! Verifique a nitidez antes de guardar.
          </p>
        )}
      </div>
    </Modal>
  );
}
