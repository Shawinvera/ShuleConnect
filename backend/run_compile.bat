@echo off
cd /d c:\Users\PC\ShuleConnect\backend
mvn compile > mvn_out.txt 2> mvn_err.txt
echo EXIT_CODE=%ERRORLEVEL% >> mvn_out.txt
