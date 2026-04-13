# Git Initialization — Run These Commands Once

Because this folder is on OneDrive, git must be initialized from Windows.
Open a terminal (PowerShell or Command Prompt), navigate to the project folder, and run:

```powershell
cd "C:\Users\Dilmi\OneDrive - collectivercm.com\Documents\Dilmi\IQ\iq-dashboard"
git init
git config user.name "IQ Dev"
git config user.email "dev@collectivercm.com"
git add .
git commit -m "Initial commit: IQ Dashboard Platform Phase 1"
```

That's it — your repo is set up and all files are committed.
