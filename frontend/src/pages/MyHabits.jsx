import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { api, errorText } from "@/lib/api";

function AddHabitForm({ onAdded }) {
  const [form, setForm] = useState({ name: "", when: "", shared: false });
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post("/habits", form);
      onAdded(data);
      setForm({ name: "", when: "", shared: false });
      toast.success("Habit added");
    } catch (err) { toast.error(errorText(err)); }
    finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="card p-6 md:p-8 space-y-5" data-testid="add-habit-form">
      <label className="block">
        <span className="label-caps">Habit name</span>
        <input className="field mt-2" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="habit-name-input" />
      </label>
      <label className="block">
        <span className="label-caps">When I do it</span>
        <textarea className="field mt-2 min-h-[96px]" value={form.when} onChange={(e) => setForm({ ...form, when: e.target.value })}
          placeholder="e.g. After my morning coffee, when the house is still quiet" data-testid="habit-when-input" />
      </label>
      <label className="flex items-center gap-3 cursor-pointer select-none">
        <input type="checkbox" className="w-5 h-5 accent-[#4A6741]" checked={form.shared} onChange={(e) => setForm({ ...form, shared: e.target.checked })} data-testid="habit-share-checkbox" />
        <span className="text-sm">Share with the community</span>
      </label>
      <button type="submit" disabled={busy} className="btn-primary inline-flex items-center gap-2" data-testid="add-habit-button">
        <Plus className="w-4 h-4" /> Add habit
      </button>
    </form>
  );
}

export default function MyHabits() {
  const [habits, setHabits] = useState(null);
  useEffect(() => { api.get("/habits/mine").then((r) => setHabits(r.data)); }, []);

  return (
    <div className="max-w-5xl fade-up">
      <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-10">My habits</h1>
      <div className="grid lg:grid-cols-[380px_1fr] gap-10 items-start">
        <AddHabitForm onAdded={(h) => setHabits([h, ...(habits || [])])} />
        <ul className="space-y-3" data-testid="my-habits-list">
          {habits && habits.length === 0 && <li className="text-[#758271]" data-testid="no-habits">No habits yet. Add your first one.</li>}
          {habits?.map((h) => (
            <li key={h.id} className="card card-hover p-5 flex items-center gap-4" data-testid={`habit-item-${h.id}`}>
              <Link to={`/habits/${h.id}`} className="font-heading font-bold text-lg hover:text-[#4A6741] transition-colors" data-testid="habit-name-link">{h.name}</Link>
              <span className={`ml-auto text-xs font-semibold px-3 py-1 rounded-full ${h.shared ? "bg-[#E9EFE5] text-[#3D5636]" : "bg-[#F2EFE7] text-[#758271]"}`} data-testid="habit-visibility">
                {h.shared ? "Shared" : "Private"}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
