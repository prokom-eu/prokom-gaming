import type { ReactNode, SVGProps } from 'react'

// Line icons from the boards (24×24, stroke = currentColor). Decorative: the parent carries the label.
type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'> & { size?: number }

function Icon({
  size = 22,
  strokeWidth = 1.8,
  children,
  ...rest
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  )
}

export const IconClock = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Icon>
)
export const IconBars = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 20V10M12 20V4M18 20v-7" />
  </Icon>
)
export const IconUser = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
  </Icon>
)
export const IconTower = (p: IconProps) => (
  <Icon {...p}>
    <rect x="7" y="3" width="10" height="18" rx="2" />
    <circle cx="12" cy="8" r="1.6" />
    <path d="M10 15h4M10 18h4" />
  </Icon>
)
export const IconGamepad = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7 8h10a4 4 0 014 4v1.5a3 3 0 01-5.3 1.9L14 13.5h-4l-1.7 1.9A3 3 0 013 13.5V12a4 4 0 014-4z" />
    <path d="M8 10.5v3M6.5 12h3" />
    <circle cx="15.5" cy="11" r=".9" fill="currentColor" stroke="none" />
    <circle cx="17.6" cy="13" r=".9" fill="currentColor" stroke="none" />
  </Icon>
)
export const IconSliders = (p: IconProps) => (
  <Icon size={24} strokeWidth={2} {...p}>
    <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
    <circle cx="15" cy="7" r="2.2" />
    <circle cx="9" cy="17" r="2.2" />
  </Icon>
)
export const IconMail = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <path d="M3.5 7.5l8.5 6 8.5-6" />
  </Icon>
)
export const IconMenu = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 7h16M4 12h16M4 17h11" />
  </Icon>
)
export const IconClose = (p: IconProps) => (
  <Icon size={20} {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Icon>
)
export const IconArrow = (p: IconProps) => (
  <Icon size={14} {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Icon>
)
export const IconBox = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 8l9-5 9 5v8l-9 5-9-5z" />
    <path d="M3 8l9 5 9-5M12 13v8" />
  </Icon>
)
export const IconBook = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 4h6a3 3 0 013 3v13a2 2 0 00-2-2H4zM20 4h-6a3 3 0 00-3 3" />
    <path d="M20 4v14h-7" />
  </Icon>
)
export const IconShield = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
    <path d="M9 12l2 2 4-4" />
  </Icon>
)
export const IconQr = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
    <path d="M14 14h3v3h-3zM18 18h3v3h-3zM14 20h2" />
  </Icon>
)
export const IconGift = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="8" width="18" height="13" />
    <path d="M3 12h18M12 8v13M12 8c-2-4-6-4-6-1s6 1 6 1zM12 8c2-4 6-4 6-1s-6 1-6 1z" />
  </Icon>
)
export const IconQuestion = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9.5a2.5 2.5 0 015 0c0 1.7-2.5 2-2.5 4M12 17h.01" />
  </Icon>
)
export const IconPhone = (p: IconProps) => (
  <Icon size={16} {...p}>
    <path d="M5 4h4l2 5-3 2a11 11 0 005 5l2-3 5 2v4a2 2 0 01-2 2A17 17 0 013 6a2 2 0 012-2z" />
  </Icon>
)

export const IconShop = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 9l2-5h12l2 5M4 9v11h16V9M4 9h16M9 20v-6h6v6" />
  </Icon>
)

export const IconEye = (p: IconProps) => (
  <Icon {...p}>
    <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </Icon>
)

/** Slavic rosette before "Rabka-Zdrój, od 2004 roku" (board Main, `.rs`). */
export const IconRosette = (p: IconProps) => (
  <Icon strokeWidth={1.4} {...p}>
    <circle cx="12" cy="12" r="11" fill="currentColor" stroke="none" opacity=".13" />
    <circle cx="12" cy="12" r="6" />
    <path d="M6.8 9A6 6 0 0 0 17.2 9" />
    <path d="M12 6a6 6 0 0 0 5.2 9" />
    <path d="M17.2 9A6 6 0 0 0 12 18" />
    <path d="M17.2 15a6 6 0 0 0-10.4 0" />
    <path d="M12 18a6 6 0 0 0-5.2-9" />
    <path d="M6.8 15A6 6 0 0 0 12 6" />
  </Icon>
)
