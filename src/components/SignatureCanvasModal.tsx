"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { X, RotateCcw, Check, PenTool } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SignatureCanvasModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (signatureDataUrl: string) => void;
  title?: string;
  subtitle?: string;
}

export const SignatureCanvasModal: React.FC<SignatureCanvasModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Assinatura Eletrônica",
  subtitle = "Assine no campo abaixo usando o dedo ou o cursor do mouse",
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const getCanvas = () => canvasRef.current;
  const getCtx = () => canvasRef.current?.getContext("2d") ?? null;

  // Configura o canvas ao abrir o modal
  const setupCanvas = useCallback(() => {
    const canvas = getCanvas();
    if (!canvas) return;
    const ctx = getCtx();
    if (!ctx) return;

    // Ajustar resolução para telas Retina (HiDPI)
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    setIsEmpty(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      // Aguarda o DOM montar antes de configurar
      const timeout = setTimeout(setupCanvas, 50);
      return () => clearTimeout(timeout);
    }
  }, [isOpen, setupCanvas]);

  const getPos = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ): { x: number; y: number } | null => {
    const canvas = getCanvas();
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();

    if ("touches" in e) {
      const touch = e.touches[0];
      if (!touch) return null;
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }

    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top,
    };
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    e.preventDefault();
    const pos = getPos(e);
    if (!pos) return;
    setIsDrawing(true);
    setIsEmpty(false);
    lastPos.current = pos;

    const ctx = getCtx();
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    e.preventDefault();
    if (!isDrawing) return;
    const pos = getPos(e);
    if (!pos || !lastPos.current) return;

    const ctx = getCtx();
    if (!ctx) return;

    // Curva suave entre pontos
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
  };

  const stopDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(false);
    lastPos.current = null;
  };

  const clearCanvas = () => {
    const canvas = getCanvas();
    const ctx = getCtx();
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
  };

  const handleConfirm = () => {
    const canvas = getCanvas();
    if (!canvas || isEmpty) return;

    // Exporta o canvas com fundo branco para garantir imagem limpa no documento
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const exportCtx = exportCanvas.getContext("2d");
    if (!exportCtx) return;

    exportCtx.fillStyle = "#ffffff";
    exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    exportCtx.drawImage(canvas, 0, 0);

    const dataUrl = exportCanvas.toDataURL("image/png");
    onConfirm(dataUrl);
    clearCanvas();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-secondary/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-xl">
              <PenTool className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-foreground">{title}</h3>
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-2 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Canvas Area */}
        <div className="p-5">
          <div className="relative rounded-2xl border-2 border-dashed border-border bg-white overflow-hidden">
            {/* Linha guia da assinatura */}
            <div className="absolute bottom-[30%] left-6 right-6 border-b border-slate-300/60 pointer-events-none" />
            <span className="absolute bottom-[28%] left-6 text-[10px] text-slate-300 font-medium pointer-events-none select-none">
              Assine acima da linha
            </span>

            <canvas
              ref={canvasRef}
              className="w-full cursor-crosshair touch-none"
              style={{ height: "200px", display: "block" }}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          </div>

          {isEmpty && (
            <p className="text-xs text-center text-muted-foreground mt-2">
              Desenhe sua assinatura no campo acima
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-border flex justify-between items-center bg-secondary/10">
          <Button
            variant="ghost"
            onClick={clearCanvas}
            disabled={isEmpty}
            className="text-muted-foreground gap-2 rounded-xl"
          >
            <RotateCcw className="w-4 h-4" /> Limpar
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="rounded-xl px-5 font-bold"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isEmpty}
              className="bg-violet-600 hover:bg-violet-700 text-white font-black rounded-xl px-6 gap-2 shadow-lg shadow-violet-500/20 disabled:opacity-40"
            >
              <Check className="w-4 h-4" /> Confirmar Assinatura
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
