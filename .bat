@echo off
cd /d C:\Users\johnn\Desktop\army logs

echo =========================
echo Subiendo a GitHub...
echo =========================

git add .
git commit -m "auto update"
git push origin main

echo =========================
echo SUBIDO ✅
pause