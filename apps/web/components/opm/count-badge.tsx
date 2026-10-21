/** Red pill counting items that need the user's attention; renders nothing for zero. */
export function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      className="ml-1.5 inline-flex min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white"
      aria-label={`${count} pending`}
    >
      {count}
    </span>
  );
}
