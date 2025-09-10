@echo off
REM FFprobe Docker wrapper for Windows
docker exec ffmpeg-service ffprobe %*
