USE [master]
GO
CREATE LOGIN [sql_thin_reader] WITH PASSWORD=N'sql_password', DEFAULT_DATABASE=[master], CHECK_EXPIRATION=OFF, CHECK_POLICY=OFF
GO
USE [THINDB]
GO
CREATE USER [sql_thin_reader] FOR LOGIN [sql_thin_reader]
GO
USE [THINDB]
GO
ALTER ROLE [db_datareader] ADD MEMBER [sql_thin_reader]
GO
USE [THINDB]
GO
ALTER ROLE [db_owner] ADD MEMBER [sql_thin_reader]
GO


USE [master]
GO
CREATE LOGIN [sql_thin_writer] WITH PASSWORD=N'sql_password', DEFAULT_DATABASE=[master], CHECK_EXPIRATION=OFF, CHECK_POLICY=OFF
GO
USE [THINDB]
GO
CREATE USER [sql_thin_writer] FOR LOGIN [sql_thin_writer]
GO
USE [THINDB]
GO
ALTER ROLE [db_datareader] ADD MEMBER [sql_thin_writer]
GO
USE [THINDB]
GO
ALTER ROLE [db_datawriter] ADD MEMBER [sql_thin_writer]
GO
USE [THINDB]
GO
ALTER ROLE [db_owner] ADD MEMBER [sql_thin_writer]
GO

