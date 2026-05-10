"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./guest-bottom-nav.module.css";

type GuestBottomNavTab = "home" | "rsvp" | "gifts" | "wall";

const navItems = [
  { tab: "home", label: "Inicio", href: "/guest/home", icon: "/guest-home/nav-home.svg" },
  { tab: "rsvp", label: "RSVP", href: "/rsvp", icon: "/guest-home/nav-rsvp.svg" },
  { tab: "gifts", label: "Presentes", href: "/gifts", icon: "/guest-home/nav-gifts.svg" },
  { tab: "wall", label: "Mural", href: "/photo-wall", icon: "/guest-home/nav-wall.svg" },
] as const;

type GuestBottomNavProps = {
  activeTab?: GuestBottomNavTab;
};

export function GuestBottomNav({ activeTab }: GuestBottomNavProps) {
  const pathname = usePathname();

  function isActive(tab: GuestBottomNavTab, href: string) {
    if (activeTab) {
      return tab === activeTab;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <nav className={styles.bottomNav} aria-label="Navegacao inferior do convidado">
      {navItems.map((item) => (
        <Link
          className={`${styles.navItem} ${isActive(item.tab, item.href) ? styles.navItemActive : ""}`}
          href={item.href}
          key={item.href}
          aria-current={isActive(item.tab, item.href) ? "page" : undefined}
        >
          <img src={item.icon} alt="" aria-hidden="true" />
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
