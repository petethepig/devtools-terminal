@echo off

:: Unfortunately, this code doesn't work
:: For some reason, Node can't create process.stdin

cd "%~dp0"
node "%~dp0/devtools-terminal" --native-messaging-host