@echo off
cd /d C:\Users\johnn\Desktop\army bot

echo =========================
echo Subiendo cambios...
echo =========================

git add .
git commit -m "update %date% %time%"
git push origin main

echo =========================
echo SUBIDO ✅
pause