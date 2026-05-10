'use client';

interface BookingPanelProps {
  trace?: {
    intent?: string;
    toolResult?: unknown;
  };
}

interface BookingToolResult {
  success?: boolean;
  clubName?: string;
  date?: string;
  courtCount?: number;
  bookedSlots?: number;
  availableSlots?: string[];
  message?: string;
}

export function BookingPanel({ trace }: BookingPanelProps) {
  const result = (trace?.toolResult || null) as BookingToolResult | null;
  const isBooking = trace?.intent === 'booking' && result?.success;
  const slots = isBooking && result?.availableSlots?.length ? result.availableSlots : ['8:00', '9:00', '10:00', '11:00'];

  return (
    <section className="border-t border-[#dce6d7] bg-[#eef4eb] px-4 py-4 sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-[1.2fr_1fr]">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[#15211b]">Booking Snapshot</h2>
              <p className="mt-0.5 text-xs text-[#667468]">
                {isBooking ? result?.message : 'Waiting for a booking intent from the simulator.'}
              </p>
            </div>
            <span className="rounded-md border border-[#b8dfc4] bg-[#dff8e8] px-2 py-1 text-[11px] font-semibold text-[#1b6b3a]">
              Fake tool
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {slots.map((slot) => (
              <button
                key={slot}
                className="min-h-12 rounded-lg border border-[#d2dfcc] bg-white px-3 py-2 text-left text-sm text-[#15211b] shadow-sm transition hover:border-[#8bcaa1] hover:bg-[#f7fcf5]"
              >
                <span className="block font-semibold">{slot}</span>
                <span className="block text-[11px] text-[#667468]">{isBooking ? result?.date : 'Demo slot'}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Metric label="Courts" value={isBooking ? result?.courtCount || 8 : 8} />
          <Metric label="Booked" value={isBooking ? result?.bookedSlots || 0 : 0} />
          <Metric label="Status" value={isBooking ? 'Ready' : 'Idle'} />
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-[#d2dfcc] bg-white p-3 shadow-sm">
      <div className="text-lg font-semibold text-[#15211b]">{value}</div>
      <div className="mt-1 text-[11px] text-[#667468]">{label}</div>
    </div>
  );
}
