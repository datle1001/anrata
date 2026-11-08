import logo from "@/assets/oma-logo.png.asset.json";

export function OmaLogo({ className = "size-7" }: { className?: string }) {
  return (
    <img
      src={logo.url}
      alt=""
      aria-hidden="true"
      width={278}
      height={279}
      className={`oma-logo object-contain ${className}`}
    />
  );
}

export function OmaName({ className = "" }: { className?: string }) {
  return (
    <span aria-label="Oma" className={`inline-flex items-center gap-0.5 leading-none ${className}`}>
      <OmaLogo className="h-[1em] w-[1em]" />
      <span aria-hidden="true">MA</span>
    </span>
  );
}
