from brain.dashboard import gcal
import json

def test_tasks_flow():
    print("Testing Google Tasks Sync...")
    
    # 1. Fetch Lists
    print("Fetching Task Lists...")
    lists, err = gcal.fetch_task_lists()
    if err:
        print(f"Error fetching lists: {err}")
        return
        
    print(f"Found {len(lists)} lists.")
    print(f"All lists: {[l['title'] for l in lists]}")
    target_names = ["Reclaim", "Workouts", "To Do", "To-Do", "My Tasks"]
    
    targets = [l for l in lists if l.get("title") in target_names]
    
    if not targets:
        print("No target lists found. Creating a test one? (Skipping)")
        return

    # 2. Fetch Tasks from 'To do'
    target = next((l for l in lists if l['title'] == 'To do'), None)
    if not target:
        print("Could not find 'To do' list.")
        return

    print(f"Fetching tasks from '{target['title']}' ({target['id']})...")
    tasks, err = gcal.fetch_tasks_from_list(target['id'])
    if err:
        print(f"Error: {err}")
        return
        
    print(f"Found {len(tasks)} tasks.")
    for t in tasks[:3]:
        print(f" - {t.get('title')} ({t.get('status')})")
        
    # 3. Create Task
    print("Creating Test Task...")
    new_task, err = gcal.create_google_task(target['id'], {"title": "Test Task from Agent", "notes": "Created by verification script"})
    if err:
        print(f"Create Error: {err}")
    else:
        print(f"Created: {new_task['id']}")
        
        # 4. Patch Task
        print("Patching Task...")
        updated, err = gcal.patch_google_task(target['id'], new_task['id'], {"status": "completed"})
        if err: print(f"Patch Error: {err}")
        else: print(f"Patched Status: {updated.get('status')}")
        
        # 5. Delete Task
        print("Deleting Task...")
        success, err = gcal.delete_google_task(target['id'], new_task['id'])
        if success: print("Deleted.")
        else: print(f"Delete Error: {err}")

if __name__ == "__main__":
    try:
        test_tasks_flow()
    except Exception as e:
        print(f"Test crashed: {e}")
