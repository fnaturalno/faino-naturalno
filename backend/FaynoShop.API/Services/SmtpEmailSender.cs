using System.Net;
using System.Net.Mail;
using FaynoShop.API.Options;
using Microsoft.Extensions.Options;

namespace FaynoShop.API.Services;

/// <summary>Sends mail via SMTP when <see cref="EmailOptions.Smtp"/> is configured.</summary>
public sealed class SmtpEmailSender : IEmailSender
{
    private readonly EmailOptions _options;
    private readonly ILogger<SmtpEmailSender> _logger;

    public SmtpEmailSender(IOptions<EmailOptions> options, ILogger<SmtpEmailSender> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    public async Task SendAsync(
        string toEmail,
        string subject,
        string body,
        CancellationToken cancellationToken)
    {
        var smtp = _options.Smtp;
        if (string.IsNullOrWhiteSpace(smtp.Host))
        {
            throw new InvalidOperationException("Email:Smtp:Host is not configured.");
        }

        using var message = new MailMessage
        {
            From = new MailAddress(_options.From),
            Subject = subject,
            Body = body,
            IsBodyHtml = false
        };
        message.To.Add(toEmail);

        using var client = new SmtpClient(smtp.Host, smtp.Port)
        {
            EnableSsl = smtp.UseSsl,
            DeliveryMethod = SmtpDeliveryMethod.Network
        };

        if (!string.IsNullOrWhiteSpace(smtp.Username))
        {
            client.Credentials = new NetworkCredential(smtp.Username, smtp.Password);
        }

        try
        {
            await client.SendMailAsync(message, cancellationToken);
            _logger.LogInformation("Email sent To={ToEmail} Subject={Subject}", toEmail, subject);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email To={ToEmail} Subject={Subject}", toEmail, subject);
            throw;
        }
    }
}
