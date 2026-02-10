import subprocess, pathlib
prompt = pathlib.Path('subagent_prompt.txt').read_text()
args = [
    'codex',
    'exec',
    '--dangerously-bypass-approvals-and-sandbox',
    '--skip-git-repo-check',
    '-m', 'gpt-5.3-codex',
    '-c', 'model_reasoning_effort= xhigh',
    '-o', 'subagent_tasks.txt',
    prompt
]
print('running with prompt length', len(prompt))
subprocess.run(args, check=True)
