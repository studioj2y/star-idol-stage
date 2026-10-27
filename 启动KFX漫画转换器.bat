@echo off
chcp 65001 >nul
title KFX 漫画电子书转换器 · Studio
cd /d "%~dp0"
start pythonw kfx_gui.py
exit
