namespace WorldEventAlerts.Delivery;

public static class DeliveryChannels
{
    public const string Email = "Email";
    public const string Slack = "Slack";
}

public enum DeliveryStatus { Pending, Sending, Accepted, Failed, Ambiguous, Skipped, Omitted }
public sealed record ChannelPreference(Guid UserId, string Channel, bool Enabled);
public sealed record ChannelState(string Channel, bool Enabled);
public sealed record ChannelSettingsInput(bool Enabled);
public sealed record ChannelPreferencesInput(string[] EnabledChannels);
public sealed record DeliveryArticle(string Title, string Url);
public sealed record DeliveryLabel(string Label, int Matches);
public sealed record DeliveryMessage(string Email, IReadOnlyList<DeliveryArticle> Articles,
    IReadOnlyList<DeliveryLabel>? Labels = null, int? TotalArticles = null, MessageTemplate? Template = null)
{
    public MessageTemplate Content => Template ?? MessageTemplate.Default;
}
public sealed class DeliveryAttempt
{
    public Guid UserId { get; init; }
    public int ArticleId { get; init; }
    public required string Channel { get; init; }
    public DeliveryStatus Status { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public sealed class NotificationOptions
{
    public EmailOptions Email { get; init; } = new();
    public SlackOptions Slack { get; init; } = new();
}

public sealed class EmailOptions
{
    public bool Enabled { get; init; }
    public string Host { get; init; } = "";
    public int Port { get; init; } = 587;
    public string Security { get; init; } = "StartTls";
    public string Username { get; init; } = "";
    public string Password { get; init; } = "";
    public string FromAddress { get; init; } = "";
    public string FromName { get; init; } = "World Event Alerts";
}

public sealed class SlackOptions
{
    public bool Enabled { get; init; }
    public string BotToken { get; init; } = "";
}

public interface INotificationSender
{
    string Channel { get; }
    bool Configured { get; }
    bool EnabledByDefault { get; }
    Task<DeliveryStatus> SendAsync(DeliveryMessage message, CancellationToken token);
}
