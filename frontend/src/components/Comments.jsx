import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { api, errorText } from "@/lib/api";

export default function Comments({ habitId }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.get(`/habits/${habitId}/comments`).then((r) => setComments(r.data)); }, [habitId]);

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    try {
      const { data } = await api.post(`/habits/${habitId}/comments`, { text });
      setComments([...comments, data]);
      setText("");
    } catch (err) { toast.error(errorText(err)); }
    finally { setBusy(false); }
  };

  return (
    <section className="card p-6 md:p-8">
      <h2 className="text-base md:text-lg font-bold mb-5 flex items-center gap-2"><MessageCircle className="w-5 h-5 text-[#4A6741]" /> Comments</h2>
      <ul className="space-y-4 mb-8" data-testid="comments-list">
        {comments.length === 0 && <li className="text-sm text-[#758271]" data-testid="no-comments">No comments yet.</li>}
        {comments.map((c) => (
          <li key={c.id} className="border-l-2 border-[#D9E4D3] pl-4" data-testid={`comment-${c.id}`}>
            <p className="text-sm font-semibold text-[#2C382A]" data-testid="comment-author">{c.author_name}
              <span className="ml-2 font-normal text-xs text-[#8B9884]">{new Date(c.created_at).toLocaleString()}</span>
            </p>
            <p className="text-[#4A5D47] whitespace-pre-wrap mt-1" data-testid="comment-text">{c.text}</p>
          </li>
        ))}
      </ul>
      <form onSubmit={submit} className="space-y-3">
        <label className="block">
          <span className="label-caps">Comment</span>
          <textarea className="field mt-2 min-h-[90px]" value={text} onChange={(e) => setText(e.target.value)} data-testid="comment-input" />
        </label>
        <button type="submit" disabled={busy || !text.trim()} className="btn-primary" data-testid="post-comment-button">Post comment</button>
      </form>
    </section>
  );
}
