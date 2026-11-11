using Microsoft.Data.SqlClient;

namespace HelpDeskApi.Data;

/// <summary>
/// Equivalent of backend/src/config/db.js (sql, getPool).
/// Dapper opens/closes a connection per call, similar in effect to using the
/// pooled connection from the "mssql" package (ADO.NET pools connections under the hood).
/// </summary>
public class DbConnectionFactory
{
    private readonly string _connectionString;

    public DbConnectionFactory(IConfiguration configuration)
    {
        _connectionString = configuration.GetConnectionString("Default")
            ?? throw new InvalidOperationException("Missing ConnectionStrings:Default in appsettings.json");
    }

    /// <summary>Equivalent of getPool() - returns an open connection ready to use.</summary>
    public async Task<SqlConnection> GetOpenConnectionAsync()
    {
        var conn = new SqlConnection(_connectionString);
        await conn.OpenAsync();
        return conn;
    }
}
