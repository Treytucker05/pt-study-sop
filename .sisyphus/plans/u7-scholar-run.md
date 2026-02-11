# U7: Scholar Runnable - Implementation Spec

## Overview
Add the ability to trigger full Scholar orchestration runs from the UI with status tracking and history.

## Database Migration

### File: `brain/db_setup.py`

**Location:** In `init_database()` function, before final `conn.commit()`

**Add this block:**

```python
    # ------------------------------------------------------------------
    # Scholar Run tracking (v9.4.2 - for UI run button + history)
    # ------------------------------------------------------------------
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS scholar_runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            started_at TEXT NOT NULL,
            ended_at TEXT,
            status TEXT DEFAULT 'running',
            error_message TEXT,
            triggered_by TEXT DEFAULT 'ui',
            params_json TEXT,
            digest_id INTEGER,
            proposals_created INTEGER DEFAULT 0,
            notes TEXT,
            FOREIGN KEY(digest_id) REFERENCES scholar_digests(id)
        )
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_scholar_runs_status
        ON scholar_runs(status)
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_scholar_runs_started
        ON scholar_runs(started_at DESC)
    """)
```

## Backend Implementation

### File: `brain/dashboard/scholar.py`

**Add new function at end of file:**

```python
def run_scholar_orchestrator(save_outputs=True, triggered_by='ui', run_id=None):
    """
    Run full Scholar orchestration:
    1. Generate weekly digest from recent sessions
    2. Create proposals from digest insights
    3. Update run tracking
    
    Args:
        save_outputs: Whether to save digest to DB and files
        triggered_by: 'ui', 'scheduled', or 'manual'
        run_id: Pre-created run ID to update (optional)
    
    Returns:
        dict: {ok, run_id, digest_id, proposals_created, error}
    """
    import sqlite3
    from db_setup import get_connection
    from datetime import datetime
    
    conn = get_connection()
    cur = conn.cursor()
    
    # Create run record if not provided
    if run_id is None:
        cur.execute("""
            INSERT INTO scholar_runs (started_at, status, triggered_by)
            VALUES (?, 'running', ?)
        """, (datetime.now().isoformat(), triggered_by))
        conn.commit()
        run_id = cur.lastrowid
    
    try:
        # Step 1: Generate digest
        digest_result = generate_weekly_digest(days=7)
        
        if not digest_result.get('ok'):
            raise Exception(f"Digest generation failed: {digest_result.get('error', 'Unknown')}")
        
        # Step 2: Save digest if requested
        digest_id = None
        if save_outputs and digest_result.get('digest'):
            from dashboard.routes import _save_digest_artifacts
            saved = _save_digest_artifacts(digest_result['digest'], digest_type='weekly')
            digest_id = saved.get('id')
        
        # Step 3: Count/create proposals (simplified - actual implementation may vary)
        proposals_created = 0
        # TODO: Add proposal generation logic based on digest insights
        
        # Update run record to success
        cur.execute("""
            UPDATE scholar_runs 
            SET status = 'success', 
                ended_at = ?,
                digest_id = ?,
                proposals_created = ?,
                notes = ?
            WHERE id = ?
        """, (
            datetime.now().isoformat(),
            digest_id,
            proposals_created,
            f"Digest generated: {digest_result.get('title', 'Untitled')}",
            run_id
        ))
        conn.commit()
        
        return {
            'ok': True,
            'run_id': run_id,
            'digest_id': digest_id,
            'proposals_created': proposals_created
        }
        
    except Exception as e:
        # Update run record to failed
        cur.execute("""
            UPDATE scholar_runs 
            SET status = 'failed', 
                ended_at = ?,
                error_message = ?
            WHERE id = ?
        """, (datetime.now().isoformat(), str(e), run_id))
        conn.commit()
        
        return {
            'ok': False,
            'run_id': run_id,
            'error': str(e)
        }
    finally:
        conn.close()


def get_scholar_run_status():
    """Get the latest run status."""
    from db_setup import get_connection
    conn = get_connection()
    cur = conn.cursor()
    
    cur.execute("""
        SELECT id, status, started_at, ended_at, digest_id, proposals_created, error_message
        FROM scholar_runs
        ORDER BY started_at DESC
        LIMIT 1
    """)
    
    row = cur.fetchone()
    conn.close()
    
    if not row:
        return {'status': 'idle', 'message': 'No runs yet'}
    
    return {
        'run_id': row[0],
        'status': row[1],
        'started_at': row[2],
        'ended_at': row[3],
        'digest_id': row[4],
        'proposals_created': row[5],
        'error_message': row[6]
    }


def get_scholar_run_history(limit=10):
    """Get recent run history."""
    from db_setup import get_connection
    conn = get_connection()
    cur = conn.cursor()
    
    cur.execute("""
        SELECT id, status, started_at, ended_at, proposals_created, error_message, triggered_by
        FROM scholar_runs
        ORDER BY started_at DESC
        LIMIT ?
    """, (limit,))
    
    rows = cur.fetchall()
    conn.close()
    
    return [
        {
            'id': row[0],
            'status': row[1],
            'started_at': row[2],
            'ended_at': row[3],
            'proposals_created': row[4],
            'error_message': row[5],
            'triggered_by': row[6]
        }
        for row in rows
    ]
```

### File: `brain/dashboard/routes.py`

**Add endpoints (after existing scholar endpoints):**

```python

@dashboard_bp.route("/api/scholar/run", methods=["POST"])
def api_scholar_run():
    """Trigger a full Scholar orchestration run."""
    from dashboard.scholar import run_scholar_orchestrator, get_scholar_run_status
    import threading
    
    data = request.get_json() or {}
    triggered_by = data.get('triggered_by', 'ui')
    
    # Check if a run is already in progress
    current_status = get_scholar_run_status()
    if current_status.get('status') == 'running':
        return jsonify({
            'ok': False,
            'message': 'A run is already in progress',
            'current_run': current_status
        }), 409
    
    # Start run in background thread (don't block request)
    def run_async():
        run_scholar_orchestrator(save_outputs=True, triggered_by=triggered_by)
    
    thread = threading.Thread(target=run_async)
    thread.daemon = True
    thread.start()
    
    # Return current status (will show 'running')
    return jsonify({
        'ok': True,
        'message': 'Scholar run started',
        'status': get_scholar_run_status()
    })


@dashboard_bp.route("/api/scholar/run/status", methods=["GET"])
def api_scholar_run_status():
    """Get the current/latest run status."""
    from dashboard.scholar import get_scholar_run_status
    return jsonify(get_scholar_run_status())


@dashboard_bp.route("/api/scholar/run/history", methods=["GET"])
def api_scholar_run_history():
    """Get run history."""
    from dashboard.scholar import get_scholar_run_history
    limit = request.args.get('limit', 10, type=int)
    return jsonify({
        'ok': True,
        'runs': get_scholar_run_history(limit)
    })
```

## Frontend Implementation

### File: `dashboard_rebuild/client/src/pages/scholar.tsx`

**Add imports:**
```typescript
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/use-toast";
```

**Add to Scholar component:**
```typescript
export default function Scholar() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Add run status query
  const { data: runStatus, isLoading: statusLoading } = useQuery({
    queryKey: ["scholar", "run-status"],
    queryFn: api.scholar.getRunStatus,
    refetchInterval: 5000, // Poll every 5 seconds
  });
  
  // Add run mutation
  const runMutation = useMutation({
    mutationFn: api.scholar.run,
    onSuccess: () => {
      toast({ title: "Scholar run started" });
      queryClient.invalidateQueries({ queryKey: ["scholar", "run-status"] });
    },
    onError: (err: Error) => {
      toast({ title: "Run failed to start", description: err.message, variant: "destructive" });
    },
  });
  
  // Show completion toast when run finishes
  useEffect(() => {
    if (runStatus?.status === 'success' && previousStatus === 'running') {
      toast({ 
        title: "Scholar run complete", 
        description: `Created ${runStatus.proposals_created} proposals` 
      });
      queryClient.invalidateQueries({ queryKey: ["scholar", "stats"] });
      queryClient.invalidateQueries({ queryKey: ["scholar", "digests"] });
    }
  }, [runStatus]);
```

**Header UI:**
```tsx
<header className="flex items-center justify-between mb-6">
  <div className="flex items-center gap-4">
    <h1 className="text-2xl font-bold">SCHOLAR</h1>
    <Badge variant="outline" className="text-yellow-500 border-yellow-500">
      READ ONLY ADVISORY
    </Badge>
  </div>
  
  <div className="flex items-center gap-4">
    {/* Status display */}
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span>Last Run:</span>
      <span>{runStatus?.started_at ? formatDate(runStatus.started_at) : 'Never'}</span>
      <StatusPill status={runStatus?.status || 'idle'} />
    </div>
    
    {/* Run button */}
    <Button 
      onClick={() => runMutation.mutate()}
      disabled={runMutation.isPending || runStatus?.status === 'running'}
      size="sm"
    >
      {runStatus?.status === 'running' ? 'Running...' : 'Run Scholar'}
    </Button>
    
    {/* History link */}
    <Button variant="ghost" size="sm" onClick={() => setShowHistory(!showHistory)}>
      History
    </Button>
    
    <Button variant="ghost" size="sm" onClick={handleRefresh}>
      Refresh
    </Button>
  </div>
</header>

{/* History panel */}
{showHistory && <RunHistoryPanel />}
```

### Add StatusPill component:
```tsx
function StatusPill({ status }: { status: string }) {
  const colors = {
    idle: 'bg-gray-500',
    running: 'bg-blue-500 animate-pulse',
    success: 'bg-green-500',
    failed: 'bg-red-500',
  };
  
  return (
    <span className={`px-2 py-0.5 rounded text-xs text-white ${colors[status] || colors.idle}`}>
      {status}
    </span>
  );
}
```

### Add RunHistoryPanel component:
```tsx
function RunHistoryPanel() {
  const { data: history } = useQuery({
    queryKey: ["scholar", "run-history"],
    queryFn: () => api.scholar.getRunHistory(10),
  });
  
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-sm">Recent Runs</CardTitle>
      </CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Date</th>
              <th className="text-left py-2">Status</th>
              <th className="text-left py-2">Proposals</th>
              <th className="text-left py-2">Trigger</th>
            </tr>
          </thead>
          <tbody>
            {history?.runs?.map((run) => (
              <tr key={run.id} className="border-b">
                <td className="py-2">{formatDate(run.started_at)}</td>
                <td className="py-2"><StatusPill status={run.status} /></td>
                <td className="py-2">{run.proposals_created}</td>
                <td className="py-2">{run.triggered_by}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
```

### Add API methods (dashboard_rebuild/client/src/lib/api.ts):
```typescript
export const api = {
  // ... existing methods
  
  scholar: {
    // ... existing methods
    
    run: async () => {
      const res = await fetch('/api/scholar/run', { method: 'POST' });
      return res.json();
    },
    
    getRunStatus: async () => {
      const res = await fetch('/api/scholar/run/status');
      return res.json();
    },
    
    getRunHistory: async (limit = 10) => {
      const res = await fetch(`/api/scholar/run/history?limit=${limit}`);
      return res.json();
    },
  },
};
```

## Testing Checklist

- [ ] POST /api/scholar/run returns `{ok, status}` immediately
- [ ] GET /api/scholar/run/status shows 'running' then 'success'
- [ ] History shows completed runs with timestamps
- [ ] UI button disables while running
- [ ] Success toast appears when run completes
- [ ] Proposals count updates in history

## Files Modified

1. `brain/db_setup.py` - Add scholar_runs table
2. `brain/dashboard/scholar.py` - Add run functions
3. `brain/dashboard/routes.py` - Add endpoints
4. `dashboard_rebuild/client/src/pages/scholar.tsx` - Add UI
5. `dashboard_rebuild/client/src/lib/api.ts` - Add API methods
