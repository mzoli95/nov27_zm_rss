using MailKit;
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace WorldEventAlerts.Delivery;

public sealed class EmailSender(ProviderSettings options) : INotificationSender
{
    private EmailOptions Settings => options.Email;
    public string Channel => DeliveryChannels.Email;
    public bool Configured => !string.IsNullOrWhiteSpace(Settings.Host) &&
        MailboxAddress.TryParse(Settings.FromAddress, out _);
    public bool EnabledByDefault => Settings.Enabled;

    public async Task<DeliveryStatus> SendAsync(DeliveryMessage alert, CancellationToken token)
    {
        EmailOptions settings = Settings;
        if (!MailboxAddress.TryParse(alert.Email, out MailboxAddress? recipient) ||
            !MailboxAddress.TryParse(settings.FromAddress, out MailboxAddress? sender))
            return DeliveryStatus.Failed;
        MimeMessage message = new();
        message.From.Add(new MailboxAddress(settings.FromName, sender.Address));
        message.To.Add(recipient);
        message.Subject = alert.Articles.Count == 1 ? "World Event Alerts: 1 new article" :
            $"World Event Alerts: {alert.Articles.Count} new articles";
        message.Body = BuildBody(alert.Articles).ToMessageBody();

        using SmtpClient smtp = new() { Timeout = 10_000 };
        bool sending = false;
        try
        {
            SecureSocketOptions security = settings.Security == nameof(SecureSocketOptions.SslOnConnect)
                ? SecureSocketOptions.SslOnConnect : SecureSocketOptions.StartTls;
            await smtp.ConnectAsync(settings.Host, settings.Port, security, token);
            if (!string.IsNullOrEmpty(settings.Username))
                await smtp.AuthenticateAsync(settings.Username, settings.Password, token);
            sending = true;
            await smtp.SendAsync(message, token);
            return DeliveryStatus.Accepted;
        }
        catch (SmtpCommandException) { return DeliveryStatus.Failed; }
        catch (Exception error) when (!token.IsCancellationRequested &&
            error is (IOException or TimeoutException or ServiceNotConnectedException or
                ServiceNotAuthenticatedException or MailKit.Security.AuthenticationException or
                System.Net.Sockets.SocketException or OperationCanceledException))
        {
            return sending ? DeliveryStatus.Ambiguous : DeliveryStatus.Failed;
        }
    }

    internal static BodyBuilder BuildBody(IReadOnlyList<DeliveryArticle> articles)
    {
        string links = string.Concat(articles.Select(article =>
            $"""
            <li style="margin:0 0 12px">
              <a style="font-weight:bold;color:#1759b0" href="{System.Net.WebUtility.HtmlEncode(article.Url)}">{System.Net.WebUtility.HtmlEncode(article.Title)}</a>
            </li>
            """));
        return new BodyBuilder
        {
            TextBody = string.Join(Environment.NewLine + Environment.NewLine,
                articles.Select(article => article.Title + Environment.NewLine + article.Url)),
            HtmlBody = $"""
                <div style="background:#f4f8fe;padding:24px;font:16px Arial,sans-serif;color:#11243b">
                  <div style="background:#fff;border:1px solid #d7e3f2;border-radius:14px;max-width:540px;margin:auto;padding:24px">
                    <p style="color:#1759b0;font-weight:bold">World Event Alerts</p>
                    <h1 style="font-size:22px;line-height:1.4">New articles matching your alerts</h1>
                    <ul style="padding-left:24px">{links}</ul>
                    <p style="font-size:13px;color:#4b6179">Manage email delivery in your World Event Alerts profile.</p>
                  </div>
                </div>
                """
        };
    }
}
