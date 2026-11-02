import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { api, errorText, lastSevenDays } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import Comments from "@/components/Comments";

function LastSevenDays({ habit, isOwner, onChange }) {
  const done = new Set(habit.done_dates);
  const toggle = async (day, checked) => {
    try {
      const { data } = await api.put(`/habits/${habit.id}/ticks/${day}`, { done: checked });
      onChange(data);
    } catch (err) { toast.error(errorText(err)); }
  };
  return (
    <section className="card p-6 md:p-8">
      <h2 className="text-base md:text-lg font-bold mb-5">Last 7 days</h2>
      <ul className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3" data-testid="last-7-days-list">
        {lastSevenDays().map((day) => (
          <li key={day}>
            <label className={`flex flex-col items-center gap-2 p-3 rounded-xl border border-[#E8E6DF] transition-colors ${done.has(day) ? "bg-[#E9EFE5]" : "bg-[#FDFBF7]"} ${isOwner ? "cursor-pointer hover:border-[#4A6741]" : "opacity-80"}`}>
              <input type="checkbox" className="w-6 h-6 accent-[#4A6741]" checked={done.has(day)} disabled={!isOwner}
                onChange={(e) => toggle(day, e.target.checked)} data-testid={`day-checkbox-${day}`} />
              <span className="text-xs font-medium tabular-nums">{day}</span>
            </label>
          </li>
        ))}
      </ul>
      {!isOwner && <p className="mt-4 text-xs text-[#758271]">Only the owner can change these.</p>}
    </section>
  );
}

export default function HabitPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [habit, setHabit] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setHabit(null); setError("");
    api.get(`/habits/${id}`).then((r) => setHabit(r.data)).catch((e) => setError(errorText(e)));
  }, [id]);

  if (error) return <p className="text-[#B4492F]" data-testid="habit-error">{error}</p>;
  if (!habit) return <p className="text-[#758271]">Loading…</p>;
  const isOwner = habit.owner_id === user.id;

  return (
    <div className="max-w-4xl space-y-8 fade-up">
      <header>
        <p className="label-caps mb-2">{isOwner ? (habit.shared ? "Shared" : "Private") : `By ${habit.owner_name}`}</p>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight" data-testid="habit-title">{habit.name}</h1>
        <div className="mt-6">
          <p className="label-caps mb-1">When I do it</p>
          <p className="text-[#4A5D47] whitespace-pre-wrap" data-testid="habit-when-text">{habit.when || "—"}</p>
        </div>
      </header>
      <div className="flex flex-wrap gap-4">
        <div className="card px-6 py-4" data-testid="habit-days-done">Days done: <span className="font-heading font-bold text-xl text-[#4A6741]">{habit.days_done}</span></div>
        <div className="card px-6 py-4" data-testid="habit-current-streak">Current streak: <span className="font-heading font-bold text-xl text-[#D36B4F]">{habit.current_streak}</span></div>
      </div>
      <LastSevenDays habit={habit} isOwner={isOwner} onChange={setHabit} />
      <Comments habitId={habit.id} />
    </div>
  );
}
