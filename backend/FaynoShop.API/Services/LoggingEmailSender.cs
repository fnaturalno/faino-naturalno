namespace FaynoShop.API.Services;

public interface IEmailSender
{
    Task SendAsync(string toEmail, string subject, string body, CancellationToken cancellationToken);
}

/// <summary>
/// Dev/local stub — logs outbound mail. In Development the body (incl. reset links) is logged
/// for local testing; outside Development only recipient + subject are logged.
/// Replace with SMTP/provider implementation for production.
/// </summary>
public sealed class LoggingEmailSender : IEmailSender
{
    private readonly ILogger<LoggingEmailSender> _logger;
    private readonly IHostEnvironment _environment;

    public LoggingEmailSender(
        ILogger<LoggingEmailSender> logger,
        IHostEnvironment environment)
    {
        _logger = logger;
        _environment = environment;
    }

    public Task SendAsync(string toEmail, string subject, string body, CancellationToken cancellationToken)
    {
        if (_environment.IsDevelopment())
        {
            _logger.LogInformation(
                "Email (stub) To={ToEmail} Subject={Subject} Body={Body}",
                toEmail,
                subject,
                body);
        }
        else
        {
            _logger.LogInformation(
                "Email (stub) queued To={ToEmail} Subject={Subject}",
                toEmail,
                subject);
        }

        return Task.CompletedTask;
    }
}
