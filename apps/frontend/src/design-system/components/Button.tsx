import { colors, radius, spacing } from "../tokens";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode;
};

export function Button({ children, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      {...props}
      style={{
        padding: spacing.md,
        borderRadius: radius.md,
        border: "none",
        background: colors.primary,
        color: "white",
        width: "100%",
        cursor: "pointer",
        ...props.style,
      }}
    >
      {children}
    </button>
  );
}
