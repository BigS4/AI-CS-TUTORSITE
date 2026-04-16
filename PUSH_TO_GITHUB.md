# How to Push This Project to GitHub

Follow these steps in your Terminal (Mac) or Command Prompt (Windows).

## Step 1 — Open Terminal and go to this folder

On Mac, open Terminal and type:
```
cd ~/Documents/Claude/Visual\ CS\ Tutor
```
(Or drag the folder into Terminal after typing `cd `)

## Step 2 — Run these 4 commands, one by one:

```bash
# 1. Initialize git (makes this folder a git repository)
git init

# 2. Connect your folder to your GitHub repo
git remote add origin https://github.com/BigS4/AI-CS-TUTOR-SITE.git

# 3. Stage all the files (tell git "track these files")
git add .

# 4. Create your first commit (a save point with a message)
git commit -m "Initial commit: Add AI CS Tutor website"

# 5. Push to GitHub! (upload everything)
git push -u origin main
```

## If it asks for your password:

GitHub no longer accepts your account password — you need a **Personal Access Token**.

1. Go to: https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Give it a name, set expiration, check the "repo" checkbox
4. Copy the token
5. When Terminal asks for your password, paste the token instead

## You're done! 🎉

Visit https://github.com/BigS4/AI-CS-TUTOR-SITE to see your files on GitHub!
