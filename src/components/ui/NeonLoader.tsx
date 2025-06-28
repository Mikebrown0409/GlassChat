/**
 * NeonLoader – "chasing arc" spinner.
 * Two 270° arcs rotate in opposite directions creating
 * a neon chase effect.
 */
export function NeonLoader({ size = 56 }: { size?: number }) {
  return <div className="chase-ring" style={{ width: size, height: size }} />;
}
