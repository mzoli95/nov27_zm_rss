using MailKit;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;

namespace WorldEventAlerts.Delivery;

public sealed class EmailSender(IOptions<NotificationOptions> options) : INotificationSender
{
    private EmailOptions Settings => options.Value.Email;
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
        message.Subject = "News alert: " + alert.Title.Replace("\r", " ").Replace("\n", " ");
        message.Body = new TextPart("plain") { Text = alert.Title + Environment.NewLine + alert.Url };

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
}
