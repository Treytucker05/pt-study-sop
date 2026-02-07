import { useState } from "react";
import { Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface RatingDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (rating: { effectiveness: number; engagement: number; notes: string }) => void;
  targetName: string;
  targetType: "method" | "chain";
}

function StarRating({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="space-y-1">
      <span className="font-arcade text-[10px] text-muted-foreground">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => onChange(star)}
            className="p-0.5 hover:scale-110 transition-transform"
          >
            <Star
              className={`w-5 h-5 ${
                star <= value
                  ? "text-primary fill-primary"
                  : "text-secondary"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function RatingDialog({ open, onClose, onSubmit, targetName, targetType }: RatingDialogProps) {
  const [effectiveness, setEffectiveness] = useState(0);
  const [engagement, setEngagement] = useState(0);
  const [notes, setNotes] = useState("");

  const handleSubmit = () => {
    if (effectiveness === 0 || engagement === 0) return;
    onSubmit({ effectiveness, engagement, notes });
    setEffectiveness(0);
    setEngagement(0);
    setNotes("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-black border-2 border-primary rounded-none max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <DialogTitle className="font-arcade text-xs text-primary">
            RATE {targetType.toUpperCase()}
          </DialogTitle>
          <button onClick={onClose}>
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="space-y-4">
          <p className="font-terminal text-sm">{targetName}</p>

          <StarRating
            value={effectiveness}
            onChange={setEffectiveness}
            label="EFFECTIVENESS (did it help you learn?)"
          />

          <StarRating
            value={engagement}
            onChange={setEngagement}
            label="ENGAGEMENT (did it hold your focus?)"
          />

          <div>
            <span className="font-arcade text-[10px] text-muted-foreground">NOTES (optional)</span>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What worked? What didn't?"
              className="h-16 bg-secondary/20 border-2 border-secondary font-terminal text-sm rounded-none resize-none mt-1"
            />
          </div>

          <Button
            className="w-full font-arcade rounded-none text-xs"
            onClick={handleSubmit}
            disabled={effectiveness === 0 || engagement === 0}
          >
            SUBMIT RATING
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
