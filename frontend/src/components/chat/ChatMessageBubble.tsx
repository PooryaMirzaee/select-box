"use client";

import { mediaUrl } from "@/lib/media";
import type { ChatMessage } from "@/lib/chat";
import { cn } from "@/lib/utils";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" });
}

type Props = {
  msg: ChatMessage;
  perspective: "visitor" | "admin";
};

export function ChatMessageBubble({ msg, perspective }: Props) {
  const isOwn =
    perspective === "visitor" ? msg.sender_type === "visitor" : msg.sender_type === "admin";

  return (
    <div
      className={cn(
        "mb-2 max-w-[85%] rounded-2xl px-3 py-2 text-sm",
        msg.message_type === "internal"
          ? "mx-auto border border-dashed border-amber-500/50 bg-amber-500/10 text-amber-800 dark:text-amber-200"
          : isOwn
            ? "mr-auto rounded-br-md bg-[var(--accent)] text-[var(--accent-fg)]"
            : msg.message_type === "system"
              ? "mx-auto bg-transparent text-center text-xs text-muted"
              : "ml-auto rounded-bl-md border border-theme bg-[var(--card)]",
      )}
    >
      {msg.message_type === "internal" && (
        <p className="mb-1 text-[10px] font-medium">یادداشت داخلی</p>
      )}
      {!isOwn && msg.message_type !== "system" && msg.sender_name && (
        <p className="mb-0.5 text-[10px] font-medium text-muted">{msg.sender_name}</p>
      )}

      {msg.message_type === "image" && msg.attachment_url ? (
        <a href={mediaUrl(msg.attachment_url)} target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mediaUrl(msg.attachment_url)}
            alt={msg.attachment_name ?? "تصویر"}
            className="max-h-48 rounded-lg object-contain"
          />
        </a>
      ) : msg.message_type === "file" && msg.attachment_url ? (
        <a
          href={mediaUrl(msg.attachment_url)}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 underline"
        >
          📎 {msg.attachment_name || msg.body || "دانلود فایل"}
        </a>
      ) : (
        msg.body && <p className="whitespace-pre-wrap break-words">{msg.body}</p>
      )}

      {msg.message_type !== "system" && (
        <div
          className={cn(
            "mt-1 flex items-center gap-1 text-[10px] opacity-70",
            isOwn ? "justify-start" : "justify-end",
          )}
        >
          <span>{formatTime(msg.created_at)}</span>
          {isOwn && msg.read_at && perspective === "visitor" && (
            <span title="خوانده شده">✓✓</span>
          )}
          {isOwn && !msg.read_at && perspective === "admin" && msg.sender_type === "admin" && (
            <span title="ارسال شده">✓</span>
          )}
          {isOwn && msg.read_at && perspective === "admin" && msg.sender_type === "admin" && (
            <span title="خوانده شده">✓✓</span>
          )}
        </div>
      )}
    </div>
  );
}
