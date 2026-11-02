import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";

export default function Community() {
  const [habits, setHabits] = useState(null);
  useEffect(() => { api.get("/habits/community").then((r) => setHabits(r.data)); }, []);

  return (
    <div className="max-w-5xl fade-up">
      <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-3">Community</h1>
      <p className="text-[#758271] mb-10">Habits members have chosen to share.</p>
      {habits && habits.length === 0 && <p className="text-[#758271]" data-testid="no-community-habits">No shared habits yet.</p>}
      <div className="grid md:grid-cols-2 gap-6" data-testid="community-list">
        {habits?.map((h) => (
          <article key={h.id} className="card card-hover p-6 flex flex-col gap-3" data-testid={`community-habit-${h.id}`}>
            <Link to={`/habits/${h.id}`} className="font-heading font-bold text-xl hover:text-[#4A6741] transition-colors" data-testid="community-habit-name-link">{h.name}</Link>
            <p className="text-sm text-[#758271]" data-testid="community-habit-owner">by <span className="font-semibold text-[#4A5D47]">{h.owner_name}</span></p>
            <div>
              <p className="label-caps mb-1">When I do it</p>
              <p className="text-[#4A5D47] whitespace-pre-wrap" data-testid="community-habit-when">{h.when || "—"}</p>
            </div>
            <p className="mt-auto pt-3 border-t border-[#E8E6DF] text-sm" data-testid="community-habit-days-done">
              Days done: <span className="font-bold text-[#4A6741]">{h.days_done}</span>
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
