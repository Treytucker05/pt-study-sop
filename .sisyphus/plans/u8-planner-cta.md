# U8: Planner CTA After JSON Attach - Implementation Spec

## Overview
After successfully attaching JSON to a session, prompt the user to generate planner tasks with a toast notification containing action buttons.

## Backend
No backend changes required. Uses existing `POST /api/planner/generate` endpoint.

## Frontend Implementation

### File: `dashboard_rebuild/client/src/components/IngestionTab.tsx`

**Current component location:** Used in Brain page for "Attach JSON to Session" functionality.

**Changes needed:**

1. **Add imports:**
```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/use-toast";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
```

2. **Add generate planner mutation:**
```typescript
export function IngestionTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Add this mutation
  const generateMutation = useMutation({
    mutationFn: api.planner.generate,
    onSuccess: (data) => {
      toast({
        title: "Planner tasks generated",
        description: `${data.tasks_created} review tasks created from weak anchors`,
      });
      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ["planner", "queue"] });
      queryClient.invalidateQueries({ queryKey: ["brain", "metrics"] });
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to generate tasks",
        description: err.message,
        variant: "destructive",
      });
    },
  });
```

3. **Modify success handler:**
Find the existing success handler in the JSON attach mutation (around line 45-55), and modify it:

```typescript
const attachMutation = useMutation({
  mutationFn: async (data: { sessionId: string; trackerJson: string; enhancedJson: string }) => {
    const res = await api.brain.ingestSessionJson(data);
    return res;
  },
  onSuccess: (data) => {
    // Show immediate success
    toast({
      title: "Session updated",
      description: `Attached JSON to session ${data.session_id}`,
    });
    
    // Show actionable CTA toast
    toast({
      title: "Next step: Generate planner tasks?",
      description: "Create review tasks from weak anchors and exit tickets",
      duration: 10000, // 10 seconds
      action: (
        <Button
          size="sm"
          onClick={() => {
            generateMutation.mutate();
            // Dismiss this toast
          }}
          disabled={generateMutation.isPending}
        >
          {generateMutation.isPending ? "Generating..." : "Generate Now"}
        </Button>
      ),
    });
    
    // Clear form
    setTrackerJson("");
    setEnhancedJson("");
    setSelectedSession("");
    
    // Refresh session list
    queryClient.invalidateQueries({ queryKey: ["sessions"] });
  },
  onError: (err: Error) => {
    toast({
      title: "Failed to attach JSON",
      description: err.message,
      variant: "destructive",
    });
  },
});
```

## Alternative: Inline CTA (if toast action is too complex)

If the toast action button is difficult to implement with your toast system, use this inline approach instead:

```typescript
// Add state for showing CTA
const [showGenerateCta, setShowGenerateCta] = useState(false);

// In success handler:
onSuccess: (data) => {
  toast({
    title: "Session updated",
    description: `Attached JSON to session ${data.session_id}`,
  });
  
  // Show inline CTA instead of toast action
  setShowGenerateCta(true);
  
  // Auto-hide after 10 seconds
  setTimeout(() => setShowGenerateCta(false), 10000);
  
  // Clear form
  setTrackerJson("");
  setEnhancedJson("");
  setSelectedSession("");
  
  // Refresh
  queryClient.invalidateQueries({ queryKey: ["sessions"] });
}

// In JSX, after the form:
{showGenerateCta && (
  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
    <p className="text-sm text-blue-800 mb-2">
      Session updated! Generate planner tasks now?
    </p>
    <div className="flex gap-2">
      <Button
        size="sm"
        onClick={() => {
          generateMutation.mutate();
          setShowGenerateCta(false);
        }}
        disabled={generateMutation.isPending}
      >
        {generateMutation.isPending ? "Generating..." : "Generate Now"}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setShowGenerateCta(false)}
      >
        Later
      </Button>
    </div>
  </div>
)}
```

## API Method (ensure this exists in api.ts)

```typescript
export const api = {
  planner: {
    // ... existing methods
    
    generate: async () => {
      const res = await fetch('/api/planner/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Failed to generate tasks');
      return res.json();
    },
  },
};
```

## UX Flow

1. User pastes Tracker JSON and Enhanced JSON
2. User selects session (or creates new)
3. User clicks "Attach JSON"
4. System validates and attaches JSON
5. **NEW:** Toast appears: "Session updated. Next step: Generate planner tasks? [Generate Now] [Later]"
6. If user clicks "Generate Now":
   - POST /api/planner/generate called
   - Planner queue refreshed
   - Success toast: "5 review tasks created"
7. If user clicks "Later" or toast expires:
   - User can manually click "GENERATE" in NextActions later

## Testing Checklist

- [ ] Attach JSON succeeds
- [ ] CTA toast appears immediately after success
- [ ] "Generate Now" button triggers planner generation
- [ ] Success toast shows tasks created count
- [ ] Planner queue updates automatically
- [ ] "Later" dismisses CTA without generating
- [ ] Form clears after successful attach

## Files Modified

1. `dashboard_rebuild/client/src/components/IngestionTab.tsx` - Add CTA logic
2. `dashboard_rebuild/client/src/lib/api.ts` - Ensure planner.generate exists

## Notes

- Keep the existing "GENERATE" button in NextActions component for manual generation
- This CTA is additive convenience, not replacement
- Duration of 10 seconds gives user time to read but not too long
