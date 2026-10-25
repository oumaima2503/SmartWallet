/* eslint-disable @next/next/no-img-element */

type Props = {
  name?: string | null;
  src?: string | null;
  size?: number;
  className?: string;
};

// Profile photo, or the first letter of the name on a green background
export default function Avatar({ name, src, size = 36, className = "" }: Props) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.4) };
  if (src) {
    return <img src={src} alt={name ?? "Profile photo"} style={style} className={`shrink-0 rounded-full object-cover ${className}`} />;
  }
  return (
    <span
      style={style}
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-dark to-brand font-bold text-white ${className}`}
      aria-hidden="true"
    >
      {name?.charAt(0).toUpperCase() ?? ""}
    </span>
  );
}
