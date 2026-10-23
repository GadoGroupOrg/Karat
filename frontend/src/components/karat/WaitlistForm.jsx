import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { ArrowUpRight, Check, Loader2 } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const WaitlistForm = ({ id, source }) => {
  const [email, setEmail] = useState("");
  const [state, setState] = useState("idle");
  const [position, setPosition] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      toast.error("Please enter a valid work email.");
      return;
    }
    setState("loading");
    try {
      const { data } = await axios.post(`${API}/waitlist`, { email, source });
      setPosition(data?.position ?? null);
      setState("done");
      toast.success(data?.already ? "You're already on the list." : "Welcome to Karat early access.");
    } catch {
      setState("idle");
      toast.error("Something went wrong. Please try again.");
    }
  };

  if (state === "done") {
    return (
      <div data-testid={`${id}-success`} className="flex items-center gap-3 rounded-full border border-gold/30 bg-gold/10 px-5 py-4 text-ivory">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-gold text-onyx"><Check className="h-4 w-4" /></span>
        <span className="text-sm">You're in{position ? <> — <span className="font-mono text-gold">#{position}</span> on the list</> : null}. We'll be in touch.</span>
      </div>
    );
  }

  return (
    <form onSubmit={submit} data-testid={`${id}-form`} className="group relative flex w-full max-w-md items-center rounded-full border border-white/15 bg-white/[0.04] p-1.5 backdrop-blur-md transition-colors duration-300 focus-within:border-gold/60">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@yourjewelry.com"
        data-testid={`${id}-email-input`}
        className="min-w-0 flex-1 bg-transparent px-4 py-2.5 text-sm text-ivory placeholder:text-zinc-400 focus:outline-none"
      />
      <button
        type="submit"
        disabled={state === "loading"}
        data-testid={`${id}-submit-button`}
        className="btn-gold inline-flex shrink-0 items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-medium text-onyx"
      >
        {state === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Join waitlist <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:rotate-45" /></>}
      </button>
    </form>
  );
};
