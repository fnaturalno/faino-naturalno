namespace FaynoShop.API.Services;

/// <summary>
/// Fallback when SMTP is not configured — logs outbound mail, does not deliver.
/// In Development the body (incl. reset links) is logged for local testing.
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
        _logger.LogWarning(
            "Email SMTP is not configured (Email:Smtp:Host empty) — message was NOT delivered. To={ToEmail} Subject={Subject}",
            toEmail,
            subject);

        if (_environment.IsDevelopment())
        {
            _logger.LogInformation(
                "Email (stub) Body={Body}",
                body);
        }

        return Task.CompletedTask;
    }
}
