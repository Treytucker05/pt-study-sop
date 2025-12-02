# PT Study Brain - Quick Reference

## Starting the Server

```powershell
python Run_PT_Study_Brain_AllInOne.py
```

The browser will open automatically at http://127.0.0.1:5000

## Stopping the Server

**Method 1: If running in terminal (recommended)**
- Press `Ctrl + C` in the terminal window

**Method 2: If server is stuck in background**
```powershell
python stop_server.py
```

This will find and kill all servers running on port 5000.

## Troubleshooting

### Page shows old/cached version
1. Stop all servers: `python stop_server.py`
2. Clear browser cache: `Ctrl + Shift + Delete` → Clear "Cached images and files"
3. Restart server: `python Run_PT_Study_Brain_AllInOne.py`
4. Hard refresh browser: `Ctrl + Shift + R` or `Ctrl + F5`

### Server won't start (port already in use)
```powershell
python stop_server.py
```
Then start the server again.

### Dark mode not showing
1. Make sure you're using the latest version (stop and restart server)
2. Clear browser cache completely
3. Hard refresh: `Ctrl + Shift + R`

## Best Practices

- **Always stop the server properly** with `Ctrl + C` when done
- **Don't close the terminal** without stopping the server first
- **Use `stop_server.py`** if you accidentally left servers running
- **Hard refresh** (`Ctrl + Shift + R`) after restarting the server to see changes
