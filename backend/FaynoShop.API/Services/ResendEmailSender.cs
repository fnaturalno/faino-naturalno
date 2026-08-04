using FaynoShop.API.Options;
using Microsoft.Extensions.Options;
using Resend;

namespace FaynoShop.API.Services;

/// <summary>Sends mail via the Resend HTTP API (works on Railway; SMTP ports are blocked).</summary>
public sealed class ResendEmailSender : IEmailSender
{
    private readonly IResend _resend;
    private readonly EmailOptions _options;
    private readonly ILogger<ResendEmailSender> _logger;

    public ResendEmailSender(
        IResend resend,
        IOptions<EmailOptions> options,
        ILogger<ResendEmailSender> logger)
    {
        _resend = resend;
        _options = options.Value;
        _logger = logger;
    }

    public async Task SendAsync(
        string toEmail,
        string subject,
        string body,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(_options.From))
        {
            throw new InvalidOperationException("Email:From is not configured.");
        }

        var message = new EmailMessage
        {
            From = _options.From,
            Subject = subject,
            TextBody = body
        };
        message.To.Add(toEmail);

        try
        {
            await _resend.EmailSendAsync(message, cancellationToken);
            _logger.LogInformation("Email sent via Resend To={ToEmail} Subject={Subject}", toEmail, subject);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email via Resend To={ToEmail} Subject={Subject}", toEmail, subject);
            throw;
        }
    }
}
