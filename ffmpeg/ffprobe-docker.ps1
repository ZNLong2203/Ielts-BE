# FFprobe Docker wrapper for Windows PowerShell
param(
    [Parameter(ValueFromRemainingArguments=$true)]
    [string[]]$Arguments
)

# Join all arguments into a single string
$argString = $Arguments -join ' '

# Execute docker command
& docker exec ffmpeg-service ffprobe $argString
