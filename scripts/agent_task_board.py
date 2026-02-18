#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import tempfile
import time
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

STATUSES = {"todo", "in_progress", "blocked", "done"}
PRIORITIES = {"P0", "P1", "P2", "P3"}
DEFAULT_BOARD_NAME = "agent_task_board.json"


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def detect_git_common_dir() -> Path:
    proc = subprocess.run(
        ["git", "rev-parse", "--git-common-dir"],
        capture_output=True,
        text=True,
        check=False,
    )
    if proc.returncode != 0:
        raise RuntimeError("Unable to resolve git common dir. Run this command inside a git repo.")

    out = proc.stdout.strip()
    if not out:
        raise RuntimeError("git common dir is empty.")

    common = Path(out)
    if not common.is_absolute():
        common = (Path.cwd() / common).resolve()
    return common


def resolve_board_path(board_arg: Optional[str]) -> Path:
    if board_arg:
        return Path(board_arg).expanduser().resolve()
    return detect_git_common_dir() / DEFAULT_BOARD_NAME


def default_board() -> Dict[str, Any]:
    ts = now_iso()
    return {
        "version": 1,
        "created_at": ts,
        "updated_at": ts,
        "tasks": [],
    }


def load_board(path: Path) -> Dict[str, Any]:
    if not path.exists():
        return default_board()

    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:  # noqa: BLE001
        raise RuntimeError(f"Failed to parse board at {path}: {exc}") from exc

    if not isinstance(data, dict) or "tasks" not in data:
        raise RuntimeError(f"Board file {path} is invalid (missing top-level 'tasks').")
    if not isinstance(data["tasks"], list):
        raise RuntimeError(f"Board file {path} is invalid ('tasks' must be a list).")
    return data


def save_board(path: Path, board: Dict[str, Any]) -> None:
    board["updated_at"] = now_iso()
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(board, indent=2, ensure_ascii=True) + "\n"

    # Atomic replace for consistency under concurrent readers.
    with tempfile.NamedTemporaryFile("w", delete=False, encoding="utf-8", dir=str(path.parent)) as tmp:
        tmp.write(payload)
        tmp_path = Path(tmp.name)

    os.replace(tmp_path, path)


@contextmanager
def file_lock(lock_path: Path, timeout_s: float = 10.0):
    lock_path.parent.mkdir(parents=True, exist_ok=True)
    lock_file = open(lock_path, "a+b")
    try:
        lock_file.seek(0, os.SEEK_END)
        if lock_file.tell() == 0:
            lock_file.write(b"0")
            lock_file.flush()

        start = time.monotonic()
        acquired = False

        if os.name == "nt":
            import msvcrt  # type: ignore

            while not acquired:
                try:
                    lock_file.seek(0)
                    msvcrt.locking(lock_file.fileno(), msvcrt.LK_NBLCK, 1)
                    acquired = True
                except OSError:
                    if time.monotonic() - start >= timeout_s:
                        raise TimeoutError(f"Timed out acquiring lock {lock_path}")
                    time.sleep(0.1)
        else:
            import fcntl  # type: ignore

            while not acquired:
                try:
                    fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
                    acquired = True
                except OSError:
                    if time.monotonic() - start >= timeout_s:
                        raise TimeoutError(f"Timed out acquiring lock {lock_path}")
                    time.sleep(0.1)

        yield
    finally:
        try:
            if os.name == "nt":
                import msvcrt  # type: ignore

                lock_file.seek(0)
                msvcrt.locking(lock_file.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                import fcntl  # type: ignore

                fcntl.flock(lock_file.fileno(), fcntl.LOCK_UN)
        finally:
            lock_file.close()


def with_board_write(path: Path, fn):
    lock_path = path.with_suffix(path.suffix + ".lock")
    with file_lock(lock_path):
        board = load_board(path)
        result = fn(board)
        save_board(path, board)
        return result


def with_board_read(path: Path, fn):
    lock_path = path.with_suffix(path.suffix + ".lock")
    with file_lock(lock_path):
        board = load_board(path)
        return fn(board)


def find_task(board: Dict[str, Any], task_id: str) -> Optional[Dict[str, Any]]:
    for task in board["tasks"]:
        if str(task.get("id")) == task_id:
            return task
    return None


def require_task(board: Dict[str, Any], task_id: str) -> Dict[str, Any]:
    task = find_task(board, task_id)
    if not task:
        raise RuntimeError(f"Task not found: {task_id}")
    return task


def ensure_status(status: str) -> str:
    value = status.strip().lower()
    if value not in STATUSES:
        raise RuntimeError(f"Invalid status '{status}'. Allowed: {', '.join(sorted(STATUSES))}")
    return value


def ensure_priority(priority: str) -> str:
    value = priority.strip().upper()
    if value not in PRIORITIES:
        raise RuntimeError(f"Invalid priority '{priority}'. Allowed: {', '.join(sorted(PRIORITIES))}")
    return value


def context_from_args(args: argparse.Namespace) -> Dict[str, str]:
    agent = (
        args.agent
        or os.environ.get("PT_AGENT_NAME")
        or os.environ.get("USER")
        or os.environ.get("USERNAME")
        or "unknown"
    )
    role = args.role or os.environ.get("PT_AGENT_ROLE", "")
    tool = args.tool or os.environ.get("PT_AGENT_TOOL", "")
    session = args.session or os.environ.get("PT_AGENT_SESSION", "")
    worktree = args.worktree or os.environ.get("PT_AGENT_WORKTREE", str(Path.cwd()))
    return {
        "agent": agent,
        "role": role,
        "tool": tool,
        "session": session,
        "worktree": worktree,
    }


def append_history(task: Dict[str, Any], action: str, ctx: Dict[str, str], note: str = "") -> None:
    history: List[Dict[str, Any]] = task.setdefault("history", [])
    history.append(
        {
            "ts": now_iso(),
            "action": action,
            "agent": ctx["agent"],
            "role": ctx["role"],
            "tool": ctx["tool"],
            "session": ctx["session"],
            "note": note or "",
            "status": task.get("status"),
        }
    )
    if len(history) > 500:
        del history[:-500]


def ensure_owner(task: Dict[str, Any], ctx: Dict[str, str], force: bool) -> None:
    owner = task.get("owner_agent", "")
    if owner and owner != ctx["agent"] and not force:
        raise RuntimeError(
            f"Task is owned by '{owner}'. Use --force to override or release it first."
        )


def command_init(args: argparse.Namespace) -> int:
    path = resolve_board_path(args.board)

    def _init(board: Dict[str, Any]) -> Dict[str, Any]:
        # No-op if exists; ensures shape and timestamps get persisted.
        board.setdefault("version", 1)
        board.setdefault("created_at", now_iso())
        board.setdefault("tasks", [])
        return board

    with_board_write(path, _init)
    print(f"Initialized board: {path}")
    return 0


def command_where(args: argparse.Namespace) -> int:
    path = resolve_board_path(args.board)
    print(str(path))
    return 0


def command_add(args: argparse.Namespace) -> int:
    path = resolve_board_path(args.board)
    status = ensure_status(args.status)
    priority = ensure_priority(args.priority)
    ctx = context_from_args(args)

    def _add(board: Dict[str, Any]) -> None:
        if find_task(board, args.task_id):
            raise RuntimeError(f"Task already exists: {args.task_id}")
        ts = now_iso()
        task: Dict[str, Any] = {
            "id": args.task_id,
            "title": args.title,
            "description": args.description or "",
            "priority": priority,
            "status": status,
            "created_at": ts,
            "updated_at": ts,
            "owner_agent": "",
            "owner_role": "",
            "owner_tool": "",
            "owner_session": "",
            "owner_worktree": "",
            "claimed_at": "",
            "started_at": "",
            "heartbeat_at": "",
            "completed_at": "",
            "blocked_reason": "",
            "last_note": "",
            "history": [],
        }
        if status == "in_progress":
            task["owner_agent"] = ctx["agent"]
            task["owner_role"] = ctx["role"]
            task["owner_tool"] = ctx["tool"]
            task["owner_session"] = ctx["session"]
            task["owner_worktree"] = ctx["worktree"]
            task["claimed_at"] = ts
            task["started_at"] = ts
            task["heartbeat_at"] = ts
        append_history(task, "add", ctx, args.note or "")
        board["tasks"].append(task)

    with_board_write(path, _add)
    print(f"Added task: {args.task_id}")
    return 0


def command_claim(args: argparse.Namespace) -> int:
    path = resolve_board_path(args.board)
    ctx = context_from_args(args)

    def _claim(board: Dict[str, Any]) -> None:
        task = require_task(board, args.task_id)
        ensure_owner(task, ctx, args.force)
        ts = now_iso()
        task["status"] = "in_progress"
        task["owner_agent"] = ctx["agent"]
        task["owner_role"] = ctx["role"]
        task["owner_tool"] = ctx["tool"]
        task["owner_session"] = ctx["session"]
        task["owner_worktree"] = ctx["worktree"]
        if not task.get("started_at"):
            task["started_at"] = ts
        task["claimed_at"] = ts
        task["heartbeat_at"] = ts
        task["updated_at"] = ts
        if args.note:
            task["last_note"] = args.note
        append_history(task, "claim", ctx, args.note or "")

    with_board_write(path, _claim)
    print(f"Claimed task: {args.task_id}")
    return 0


def command_auto_claim(args: argparse.Namespace) -> int:
    """Best-effort compatibility command used by older pre-push hooks."""
    path = resolve_board_path(args.board)
    ctx = context_from_args(args)
    note = args.note or "legacy auto-claim"

    if not args.task_id:
        print(f"Auto-claim skipped (no --task-id): {path}")
        return 0

    try:
        def _auto_claim(board: Dict[str, Any]) -> str:
            task = find_task(board, args.task_id)
            if not task:
                return "missing"
            if str(task.get("status", "")) == "done":
                return "done"

            owner = task.get("owner_agent", "")
            if owner and owner != ctx["agent"] and not args.force:
                return "owned"

            ts = now_iso()
            task["status"] = "in_progress"
            task["owner_agent"] = ctx["agent"]
            task["owner_role"] = ctx["role"]
            task["owner_tool"] = ctx["tool"]
            task["owner_session"] = ctx["session"]
            task["owner_worktree"] = ctx["worktree"]
            task["claimed_at"] = ts
            if not task.get("started_at"):
                task["started_at"] = ts
            task["heartbeat_at"] = ts
            task["updated_at"] = ts
            task["last_note"] = note
            append_history(task, "auto_claim", ctx, note)
            return "claimed"

        result = with_board_write(path, _auto_claim)
    except Exception as exc:  # noqa: BLE001
        print(f"Auto-claim skipped ({exc})")
        return 0

    if result == "claimed":
        print(f"Auto-claimed task: {args.task_id}")
    elif result == "missing":
        print(f"Auto-claim skipped (task not found): {args.task_id}")
    elif result == "done":
        print(f"Auto-claim skipped (task already done): {args.task_id}")
    elif result == "owned":
        print(f"Auto-claim skipped (task owned by another agent): {args.task_id}")
    else:
        print(f"Auto-claim skipped: {args.task_id}")
    return 0


def command_heartbeat(args: argparse.Namespace) -> int:
    path = resolve_board_path(args.board)
    ctx = context_from_args(args)

    def _hb(board: Dict[str, Any]) -> None:
        task = require_task(board, args.task_id)
        ensure_owner(task, ctx, args.force)
        ts = now_iso()
        task["heartbeat_at"] = ts
        task["updated_at"] = ts
        if args.note:
            task["last_note"] = args.note
        append_history(task, "heartbeat", ctx, args.note or "")

    with_board_write(path, _hb)
    print(f"Heartbeat updated: {args.task_id}")
    return 0


def command_done(args: argparse.Namespace) -> int:
    path = resolve_board_path(args.board)
    ctx = context_from_args(args)

    def _done(board: Dict[str, Any]) -> None:
        task = require_task(board, args.task_id)
        ensure_owner(task, ctx, args.force)
        ts = now_iso()
        task["status"] = "done"
        task["completed_at"] = ts
        task["heartbeat_at"] = ts
        task["updated_at"] = ts
        if args.note:
            task["last_note"] = args.note
        append_history(task, "done", ctx, args.note or "")

    with_board_write(path, _done)
    print(f"Completed task: {args.task_id}")
    return 0


def command_release(args: argparse.Namespace) -> int:
    path = resolve_board_path(args.board)
    ctx = context_from_args(args)

    def _release(board: Dict[str, Any]) -> None:
        task = require_task(board, args.task_id)
        ensure_owner(task, ctx, args.force)
        ts = now_iso()
        task["status"] = "todo"
        task["owner_agent"] = ""
        task["owner_role"] = ""
        task["owner_tool"] = ""
        task["owner_session"] = ""
        task["owner_worktree"] = ""
        task["claimed_at"] = ""
        task["heartbeat_at"] = ""
        task["updated_at"] = ts
        if args.note:
            task["last_note"] = args.note
        append_history(task, "release", ctx, args.note or "")

    with_board_write(path, _release)
    print(f"Released task: {args.task_id}")
    return 0


def command_block(args: argparse.Namespace) -> int:
    path = resolve_board_path(args.board)
    ctx = context_from_args(args)

    def _block(board: Dict[str, Any]) -> None:
        task = require_task(board, args.task_id)
        ensure_owner(task, ctx, args.force)
        ts = now_iso()
        task["status"] = "blocked"
        task["blocked_reason"] = args.reason
        task["updated_at"] = ts
        task["heartbeat_at"] = ts
        task["last_note"] = args.reason
        append_history(task, "block", ctx, args.reason)

    with_board_write(path, _block)
    print(f"Blocked task: {args.task_id}")
    return 0


def command_list(args: argparse.Namespace) -> int:
    path = resolve_board_path(args.board)
    status_filter = ensure_status(args.status) if args.status else None

    def _list(board: Dict[str, Any]) -> List[Dict[str, Any]]:
        rows = list(board["tasks"])
        if status_filter:
            rows = [t for t in rows if t.get("status") == status_filter]
        return rows

    rows = with_board_read(path, _list)
    rows.sort(key=lambda x: (x.get("status", ""), x.get("priority", ""), x.get("id", "")))

    print(f"Task board: {path}")
    if not rows:
        print("No tasks.")
        return 0

    print(f"{'ID':<14} {'STATUS':<12} {'PRIO':<4} {'OWNER':<18} {'ROLE':<8} {'UPDATED':<20} TITLE")
    print("-" * 96)
    for t in rows:
        print(
            f"{str(t.get('id','')):<14} "
            f"{str(t.get('status','')):<12} "
            f"{str(t.get('priority','')):<4} "
            f"{str(t.get('owner_agent','')):<18} "
            f"{str(t.get('owner_role','')):<8} "
            f"{str(t.get('updated_at','')):<20} "
            f"{str(t.get('title',''))}"
        )
    return 0


def command_show(args: argparse.Namespace) -> int:
    path = resolve_board_path(args.board)

    def _show(board: Dict[str, Any]) -> Dict[str, Any]:
        task = require_task(board, args.task_id)
        return task

    task = with_board_read(path, _show)
    print(json.dumps(task, indent=2, ensure_ascii=True))
    return 0


def command_status(args: argparse.Namespace) -> int:
    path = resolve_board_path(args.board)

    def _status(board: Dict[str, Any]) -> Dict[str, int]:
        counts = {k: 0 for k in STATUSES}
        for task in board["tasks"]:
            st = str(task.get("status", "todo"))
            if st not in counts:
                counts[st] = 0
            counts[st] += 1
        return counts

    counts = with_board_read(path, _status)
    print(f"Task board: {path}")
    print(
        " | ".join(
            [
                f"todo={counts.get('todo',0)}",
                f"in_progress={counts.get('in_progress',0)}",
                f"blocked={counts.get('blocked',0)}",
                f"done={counts.get('done',0)}",
            ]
        )
    )
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Shared agent task board for parallel worktrees.")
    parser.add_argument("--board", help="Optional board file path. Defaults to <git-common-dir>/agent_task_board.json")

    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("init", help="Initialize task board if missing.")
    sub.add_parser("where", help="Print resolved board path.")
    sub.add_parser("status", help="Show task counts by status.")

    p_list = sub.add_parser("list", help="List tasks.")
    p_list.add_argument("--status", choices=sorted(STATUSES), help="Filter by status.")

    p_show = sub.add_parser("show", help="Show one task.")
    p_show.add_argument("--task-id", required=True)

    p_add = sub.add_parser("add", help="Add a task.")
    p_add.add_argument("--task-id", required=True)
    p_add.add_argument("--title", required=True)
    p_add.add_argument("--description", default="")
    p_add.add_argument("--priority", default="P1")
    p_add.add_argument("--status", default="todo", choices=sorted(STATUSES))
    p_add.add_argument("--note", default="")
    p_add.add_argument("--agent", default="")
    p_add.add_argument("--role", default="")
    p_add.add_argument("--tool", default="")
    p_add.add_argument("--session", default="")
    p_add.add_argument("--worktree", default="")

    common_owner = argparse.ArgumentParser(add_help=False)
    common_owner.add_argument("--task-id", required=True)
    common_owner.add_argument("--note", default="")
    common_owner.add_argument("--agent", default="")
    common_owner.add_argument("--role", default="")
    common_owner.add_argument("--tool", default="")
    common_owner.add_argument("--session", default="")
    common_owner.add_argument("--worktree", default="")
    common_owner.add_argument("--force", action="store_true")

    sub.add_parser("claim", parents=[common_owner], help="Claim and mark task in progress.")
    sub.add_parser("start", parents=[common_owner], help="Alias for claim.")
    sub.add_parser("heartbeat", parents=[common_owner], help="Update in-progress heartbeat.")
    sub.add_parser("done", parents=[common_owner], help="Mark task done.")
    sub.add_parser("release", parents=[common_owner], help="Release task back to todo.")

    p_auto_claim = sub.add_parser(
        "auto-claim",
        help="Best-effort compatibility alias for legacy hooks. Never fails.",
    )
    p_auto_claim.add_argument("--task-id", default="")
    p_auto_claim.add_argument("--note", default="")
    p_auto_claim.add_argument("--agent", default="")
    p_auto_claim.add_argument("--role", default="")
    p_auto_claim.add_argument("--tool", default="")
    p_auto_claim.add_argument("--session", default="")
    p_auto_claim.add_argument("--worktree", default="")
    p_auto_claim.add_argument("--force", action="store_true")

    p_block = sub.add_parser("block", parents=[common_owner], help="Mark task blocked.")
    p_block.add_argument("--reason", required=True)

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    try:
        cmd = args.command
        if cmd == "init":
            return command_init(args)
        if cmd == "where":
            return command_where(args)
        if cmd == "status":
            return command_status(args)
        if cmd == "list":
            return command_list(args)
        if cmd == "show":
            return command_show(args)
        if cmd == "add":
            return command_add(args)
        if cmd in {"claim", "start"}:
            return command_claim(args)
        if cmd == "auto-claim":
            return command_auto_claim(args)
        if cmd == "heartbeat":
            return command_heartbeat(args)
        if cmd == "done":
            return command_done(args)
        if cmd == "release":
            return command_release(args)
        if cmd == "block":
            return command_block(args)
        raise RuntimeError(f"Unhandled command: {cmd}")
    except Exception as exc:  # noqa: BLE001
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
