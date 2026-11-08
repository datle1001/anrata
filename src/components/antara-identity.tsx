import logo from "@/assets/antara-logo.png";

export function AntaraLogo({ className = "size-8" }: { className?: string }) {
  return (
    <img
      src={logo}
      alt=""
      aria-hidden="true"
      className={`antara-logo object-contain ${className}`}
    />
  );
}

/** Brand word: the orbit-A logo stands in for the leading "A" of "Antara". */
export function AntaraWord() {
  return (
    <span aria-label="Antara" className="brand-word">
      <AntaraLogo className="" />
      <span aria-hidden="true">ntara</span>
    </span>
  );
}
