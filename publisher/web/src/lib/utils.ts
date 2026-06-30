export function formatPrice(price: string) {
  const n = parseFloat(price);
  if (Number.isNaN(n)) return price;
  return `${Math.round(n).toLocaleString("fa-IR")} تومان`;
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleString("fa-IR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
