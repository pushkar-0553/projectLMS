@echo off
echo Running safe database migration...
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -h localhost -P 3307 -u root -ppushkara@123 < database\migrate_safe.sql
echo Migration complete!
pause
