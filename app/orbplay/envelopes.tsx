export type Envelope = { prize: string; opened: boolean };

type Props = { items: Envelope[]; round: number; disabled: boolean; onOpen: (i: number, el: HTMLButtonElement) => void };

// lưới bao lì xì úp; key={round} để mỗi lần xáo bao mới thì chạy lại hiệu ứng chia bao
export function Envelopes({ items, round, disabled, onOpen }: Props) {
  return (
    <ol key={round} className="grid w-full grid-cols-4 gap-3 sm:grid-cols-5 lg:grid-cols-6">
      {items.map((e, i) => (
        <li key={i} className="envelope-deal" style={{ "--i": Math.min(i, 40) } as React.CSSProperties}>
          <button
            type="button"
            className="envelope"
            data-opened={e.opened || undefined}
            disabled={disabled || e.opened}
            aria-label={e.opened ? `Bao số ${i + 1}: ${e.prize}` : `Mở bao lì xì số ${i + 1}`}
            onClick={(ev) => onOpen(i, ev.currentTarget)}
          >
            {e.opened ? (
              <span className="line-clamp-3 animate-in zoom-in-50 fade-in px-1 text-center font-display text-base leading-tight sm:text-lg font-bold break-words text-primary duration-300 motion-reduce:animate-none">
                {e.prize}
              </span>
            ) : (
              <span className="seal" aria-hidden>Lộc</span>
            )}
          </button>
        </li>
      ))}
    </ol>
  );
}
