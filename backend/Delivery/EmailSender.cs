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
        int total = alert.TotalArticles ?? alert.Articles.Count;
        message.Subject = total == 1 ? "World Event Alerts: 1 new article" :
            $"World Event Alerts: {total} new articles";
        message.Body = BuildBody(alert).ToMessageBody();

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

    internal static BodyBuilder BuildBody(DeliveryMessage digest)
    {
        DeliveryArticle[] articles = digest.Articles.Take(5).ToArray();
        DeliveryLabel[] labels = digest.Labels?.Take(5).ToArray() ?? [];
        int total = digest.TotalArticles ?? articles.Length;
        string summary = total > articles.Length
            ? $"Showing {articles.Length} of {total} new matches. See all in World Event Alerts."
            : "";
        string labelList = labels.Length == 0 ? "" :
            "<h2 style=\"font-size:16px;margin-top:20px\">Top matching labels</h2><ul>" +
            string.Concat(labels.Select(label =>
                $"<li>{System.Net.WebUtility.HtmlEncode(label.Label)} · {label.Matches}</li>")) + "</ul>";
        string links = string.Concat(articles.Select(article =>
            $"""
            <li style="margin:0 0 12px">
              <a style="font-weight:bold;color:#1759b0" href="{System.Net.WebUtility.HtmlEncode(article.Url)}">{System.Net.WebUtility.HtmlEncode(article.Title)}</a>
            </li>
            """));
        return new BodyBuilder
        {
            TextBody = string.Join(Environment.NewLine + Environment.NewLine,
                articles.Select(article => article.Title + Environment.NewLine + article.Url)) +
                (summary.Length == 0 ? "" : Environment.NewLine + Environment.NewLine + summary) +
                (labels.Length == 0 ? "" : Environment.NewLine + Environment.NewLine + "Top matching labels" +
                    Environment.NewLine + string.Join(Environment.NewLine,
                        labels.Select(label => $"{label.Label}: {label.Matches}"))),
            HtmlBody = $"""
                <div style="background:#f4f8fe;padding:24px;font:16px Arial,sans-serif;color:#11243b">
                  <div style="background:#fff;border:1px solid #d7e3f2;border-radius:14px;max-width:540px;margin:auto;padding:24px">
                    <p style="color:#1759b0;font-weight:bold">World Event Alerts</p>
                    <h1 style="font-size:22px;line-height:1.4">New articles matching your alerts</h1>
                    <p>{summary}</p>
                    <ul style="padding-left:24px">{links}</ul>
                    {labelList}
                    <p style="font-size:13px;color:#4b6179">Manage email delivery in your World Event Alerts profile.</p>
                  </div>
                </div>
                """
        };
    }
}
