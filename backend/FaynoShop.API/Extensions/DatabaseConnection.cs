using Npgsql;

namespace FaynoShop.API.Extensions;

public static class DatabaseConnection
{
    /// <summary>
    /// Railway injects <c>DATABASE_URL</c> (<c>postgresql://…</c>) when Postgres is linked.
    /// Local/dev uses <c>ConnectionStrings:DefaultConnection</c>.
    /// </summary>
    public static string Resolve(IConfiguration configuration, IHostEnvironment environment)
    {
        var databaseUrl =
            FirstNonEmpty(
                configuration["DATABASE_URL"],
                configuration["DATABASE_PRIVATE_URL"],
                configuration["DATABASE_PUBLIC_URL"]);
        if (!string.IsNullOrWhiteSpace(databaseUrl))
        {
            return ToNpgsql(databaseUrl);
        }

        var fromPgVars = FromPgEnvironment(configuration);
        if (!string.IsNullOrWhiteSpace(fromPgVars))
        {
            return fromPgVars;
        }

        var configured = configuration.GetConnectionString("DefaultConnection");
        if (string.IsNullOrWhiteSpace(configured))
        {
            throw new InvalidOperationException(
                "Set DATABASE_URL (Railway Postgres) or ConnectionStrings__DefaultConnection.");
        }

        if (!environment.IsDevelopment() && IsLoopback(configured))
        {
            throw new InvalidOperationException(
                "Production is using localhost Postgres. Link Railway Postgres (DATABASE_URL) " +
                "or set ConnectionStrings__DefaultConnection to the managed database.");
        }

        return configured;
    }

    private static string ToNpgsql(string value)
    {
        if (!value.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase)
            && !value.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
        {
            return value;
        }

        var uri = new Uri(value);
        var userInfo = uri.UserInfo.Split(':', 2);
        var builder = new NpgsqlConnectionStringBuilder
        {
            Host = uri.Host,
            Port = uri.IsDefaultPort ? 5432 : uri.Port,
            Database = uri.AbsolutePath.Trim('/'),
            Username = Uri.UnescapeDataString(userInfo[0]),
            Password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : string.Empty,
            SslMode = SslMode.Require,
            TrustServerCertificate = true,
        };

        return builder.ConnectionString;
    }

    private static string? FromPgEnvironment(IConfiguration configuration)
    {
        var host = configuration["PGHOST"];
        if (string.IsNullOrWhiteSpace(host) || IsLoopbackHost(host))
        {
            return null;
        }

        var builder = new NpgsqlConnectionStringBuilder
        {
            Host = host,
            Port = int.TryParse(configuration["PGPORT"], out var port) ? port : 5432,
            Database = configuration["PGDATABASE"] ?? "railway",
            Username = configuration["PGUSER"] ?? "postgres",
            Password = configuration["PGPASSWORD"] ?? string.Empty,
            SslMode = SslMode.Require,
            TrustServerCertificate = true,
        };
        return builder.ConnectionString;
    }

    private static string? FirstNonEmpty(params string?[] values) =>
        values.FirstOrDefault(v => !string.IsNullOrWhiteSpace(v));

    private static bool IsLoopbackHost(string host) =>
        host is "localhost" or "127.0.0.1" or "::1";

    private static bool IsLoopback(string connectionString)
    {
        try
        {
            var builder = new NpgsqlConnectionStringBuilder(connectionString);
            var host = builder.Host ?? string.Empty;
            return IsLoopbackHost(host);
        }
        catch (ArgumentException)
        {
            return false;
        }
    }
}
