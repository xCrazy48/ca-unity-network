import logoAsset from "@/assets/unity-logo.jpg.asset.json";

type Size = "xs" | "sm" | "md" | "lg" | "xl";
const sizeMap: Record<Size, string> = {
  xs: "h-6 w-6",
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-14 w-14",
  xl: "h-20 w-20",
};

export function UnityLogo({
  size = "sm",
  withWordmark = false,
  className = "",
}: {
  size?: Size;
  withWordmark?: boolean;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <img
        src={logoAsset.url}
        alt="CA Unity Network"
        className={`${sizeMap[size]} rounded-lg object-contain bg-white p-0.5 shadow-elegant`}
        loading="eager"
        decoding="async"
      />
      {withWordmark && (
        <span className="font-display text-xl font-semibold tracking-tight">
          CA Unity Network
        </span>
      )}
    </span>
  );
}
