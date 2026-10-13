"use client";

import { Check, Link2, Mail, Share2, X as CloseIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { translate } from "@/lib/translation-engine";

type Props = {
  productName: string;
  productImage?: string;
  languageCode?: string;
};

export default function ShareProductButton({ productName, productImage, languageCode }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const rootRef = useRef<HTMLSpanElement>(null);
  const t = (value: string) => translate(value, languageCode);

  useEffect(() => {
    setShareUrl(window.location.href);
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  async function copyLink() {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const field = document.createElement("textarea");
      field.value = url;
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.appendChild(field);
      field.select();
      document.execCommand("copy");
      field.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function share() {
    const canUseNativeShare = typeof navigator.share === "function" && navigator.maxTouchPoints > 0;
    if (canUseNativeShare) {
      try {
        await navigator.share({
          title: productName,
          text: t(`Check out ${productName}`),
          url: window.location.href,
        });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    setOpen((current) => !current);
  }

  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedName = encodeURIComponent(productName);
  const encodedMessage = encodeURIComponent(`${productName}\n${shareUrl}`);
  const encodedImage = productImage ? encodeURIComponent(productImage) : "";

  return (
    <span ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        onClick={() => void share()}
        aria-label={t("Share this product")}
        aria-expanded={open}
        title={t("Share this product")}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-800 shadow-md transition hover:border-sky-300 hover:text-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-400"
      >
        <Share2 className="h-5 w-5" aria-hidden="true" />
      </button>

      {open ? (
        <span className="absolute right-0 top-12 z-[70] w-44 overflow-hidden rounded-md border border-slate-300 bg-white text-left shadow-2xl" role="menu">
          <span className="flex items-center border-b border-slate-200">
            <a href={`mailto:?subject=${encodedName}&body=${encodedMessage}`} className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-sm text-slate-800 hover:bg-slate-100" role="menuitem" onClick={() => setOpen(false)}>
              <Mail className="h-5 w-5 shrink-0" />
              {t("Email")}
            </a>
            <button type="button" onClick={() => setOpen(false)} className="mr-1 inline-flex h-8 w-8 items-center justify-center rounded text-slate-800 hover:bg-slate-100" aria-label={t("Close share menu")}>
              <CloseIcon className="h-5 w-5" />
            </button>
          </span>
          <a href={`https://www.pinterest.com/pin/create/button/?url=${encodedUrl}${encodedImage ? `&media=${encodedImage}` : ""}&description=${encodedName}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 border-b border-slate-200 px-3 py-2.5 text-sm text-slate-800 hover:bg-slate-100" role="menuitem" onClick={() => setOpen(false)}>
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#e60023] text-base font-bold text-white" aria-hidden="true">P</span>
            Pinterest
          </a>
          <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 border-b border-slate-200 px-3 py-2.5 text-sm text-slate-800 hover:bg-slate-100" role="menuitem" onClick={() => setOpen(false)}>
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#1877f2] text-lg font-bold text-white" aria-hidden="true">f</span>
            Facebook
          </a>
          <a href={`https://twitter.com/intent/tweet?text=${encodedName}&url=${encodedUrl}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 border-b border-slate-200 px-3 py-2.5 text-sm text-slate-800 hover:bg-slate-100" role="menuitem" onClick={() => setOpen(false)}>
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-black text-xs font-bold text-white" aria-hidden="true">X</span>
            X
          </a>
          <button type="button" onClick={() => void copyLink()} className="flex w-full items-center gap-3 px-3 py-2.5 text-sm text-slate-800 hover:bg-slate-100" role="menuitem">
            {copied ? <Check className="h-5 w-5 text-emerald-600" /> : <Link2 className="h-5 w-5" />}
            {copied ? t("Link copied") : t("Copy link")}
          </button>
        </span>
      ) : null}
    </span>
  );
}
