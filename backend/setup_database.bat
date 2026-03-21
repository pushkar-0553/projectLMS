@echo off
echo Setting up database...
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -h localhost -P 3307 -u root -ppushkara@123 < database/setup.sql
echo Database setup complete!
pause
