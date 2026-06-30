import type { ErrorKind } from "@/lib/errors";

type Props = {
  kind: ErrorKind;
  code: string;
  codeFa?: string;
};

export function ErrorIllustration({ kind, code, codeFa }: Props) {
  const display = codeFa ?? code;

  return (
    <div className="error-illustration" aria-hidden>
      <div className="error-illustration-orbit error-illustration-orbit--a" />
      <div className="error-illustration-orbit error-illustration-orbit--b" />
      <div className="error-illustration-orbit error-illustration-orbit--c" />

      <svg className="error-illustration-svg" viewBox="0 0 240 200" fill="none">
        {kind === "not_found" || kind === "product_not_found" || kind === "design_not_found" ? (
          <>
            <path
              d="M40 140 Q120 60 200 140"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="8 10"
              className="error-illustration-path"
            />
            <circle cx="120" cy="88" r="28" stroke="currentColor" strokeWidth="3" className="error-illustration-ring" />
            <path d="M108 88 L132 88 M120 76 L120 100" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </>
        ) : null}

        {kind === "server_error" || kind === "network" ? (
          <>
            <rect x="62" y="52" width="116" height="96" rx="12" stroke="currentColor" strokeWidth="3" />
            <path d="M78 76 H162 M78 96 H140 M78 116 H120" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
            <path d="M170 148 L188 166 M188 148 L170 166" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          </>
        ) : null}

        {kind === "forbidden" || kind === "unauthorized" ? (
          <>
            <rect x="88" y="70" width="64" height="72" rx="8" stroke="currentColor" strokeWidth="3" />
            <path d="M104 70 V58 C104 46 136 46 136 58 V70" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            <circle cx="120" cy="108" r="6" fill="currentColor" />
            <path d="M120 114 V124" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </>
        ) : null}

        {kind === "maintenance" ? (
          <>
            <circle cx="120" cy="100" r="36" stroke="currentColor" strokeWidth="3" />
            <path d="M120 82 V100 L132 108" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </>
        ) : null}

        {!["not_found", "product_not_found", "design_not_found", "server_error", "network", "forbidden", "unauthorized", "maintenance"].includes(kind) ? (
          <>
            <path
              d="M72 148 C72 108 168 108 168 148"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <ellipse cx="120" cy="108" rx="36" ry="18" stroke="currentColor" strokeWidth="3" />
            <path d="M96 88 C104 72 136 72 144 88" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </>
        ) : null}
      </svg>

      <p className="error-illustration-code">{display}</p>
    </div>
  );
}
