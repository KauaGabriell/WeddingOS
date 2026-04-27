import { colors, radius, spacing } from "../tokens";

type ButtonProps = {
  children: React.ReactNode;
};

export function Button({ children }: ButtonProps) {
  return (
    <button
      type="button"
      style={{
        padding: spacing.md,
        borderRadius: radius.md,
        border: "none",
        background: colors.primary,
        color: "white",
        width: "100%",
      }}
    >
      {children}
    </button>
  );
}
