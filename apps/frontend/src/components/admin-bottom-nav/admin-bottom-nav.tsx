"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./admin-bottom-nav.module.css";

const navItems = [
  { label: "Resumo", href: "/admin/dashboard", icon: "/admin-dashboard/nav-summary.svg" },
  { label: "Convidados", href: "/admin/guests", icon: "/admin-dashboard/nav-guests.svg" },
  { label: "Presentes", href: "/admin/gifts", icon: "/admin-dashboard/nav-gifts.svg" },
  { label: "Mural", href: "/admin/photo-wall", icon: "/admin-dashboard/nav-settings.svg" },
] as const;

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminBottomNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.bottomNav} aria-label="Navegacao inferior administrativa">
      {navItems.map((item) => {
        const isActive = isActivePath(pathname, item.href);
        return (
          <Link
            className={`${styles.navItem} ${isActive ? styles.navItemActive : ""}`}
            href={item.href}
            key={item.href}
            aria-current={isActive ? "page" : undefined}
          >
            <img src={item.icon} alt="" aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
