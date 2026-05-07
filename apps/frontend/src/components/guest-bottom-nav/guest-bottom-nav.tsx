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
  return (
    <nav className={styles.bottomNav} aria-label="Navegacao inferior do convidado">
      {navItems.map((item) => (
        <a
          className={`${styles.navItem} ${item.tab === activeTab ? styles.navItemActive : ""}`}
          href={item.href}
          key={item.href}
          aria-current={item.tab === activeTab ? "page" : undefined}
        >
          <img src={item.icon} alt="" aria-hidden="true" />
          <span>{item.label}</span>
        </a>
      ))}
    </nav>
  );
}
