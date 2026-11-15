"use client";

type QuantityStepperProps = {
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
  incrementDisabled?: boolean;
};

export default function QuantityStepper({ quantity, onIncrement, onDecrement, incrementDisabled }: QuantityStepperProps) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-2 py-1">
      <button type="button" className="btn-ghost" onClick={onDecrement} aria-label="One fewer">
        -
      </button>
      <span className="min-w-[2rem] text-center text-sm" aria-live="polite">{quantity}</span>
      <button
        type="button"
        className="btn-ghost disabled:cursor-not-allowed disabled:opacity-40"
        onClick={onIncrement}
        disabled={incrementDisabled}
        aria-label="One more"
        title={incrementDisabled ? "That's all we have in stock" : undefined}
      >
        +
      </button>
    </div>
  );
}
