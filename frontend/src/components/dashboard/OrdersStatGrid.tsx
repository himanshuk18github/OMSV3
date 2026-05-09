import Card from "../system/Card";

type StatusCard = {
  key: string;
  label: string;
  count: number;
  color?: string;
};

export default function OrdersStatGrid({
  data,
}: {
  data: StatusCard[];
}) {
  const cards = data ?? [];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.key} padding="p-6" className="shadow-theme-sm">
          <div className="flex items-start justify-between gap-4 text-left">
            <div className="text-left">
              <span className="app-label">{card.label}</span>
              <span className="mt-2 block text-[28px] font-bold leading-[36px] text-text-primary">
                {Number(card.count ?? 0).toLocaleString("en-IN")}
              </span>
            </div>
            <span
              className="rounded-full px-3 py-1 text-xs font-semibold"
              style={{
                color: card.color || "#1d4ed8",
                backgroundColor: `${card.color || "#1d4ed8"}20`,
              }}
            >
              Live
            </span>
          </div>
        </Card>
      ))}
    </div>
  );
}