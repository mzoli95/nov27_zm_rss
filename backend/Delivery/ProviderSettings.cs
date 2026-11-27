using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using MimeKit;
using WorldEventAlerts.Feed;

namespace WorldEventAlerts.Delivery;

public sealed record StoredChannelConfig(string Channel, string ProtectedJson);
public sealed record ProviderField(string Key, string Label, string Type);
public sealed record ProviderConfigInput(Dictionary<string, string>? Values);

public sealed class ProviderSettings(FeedDb db, IDataProtectionProvider protection, IOptions<NotificationOptions> options)
{
    private readonly Dictionary<string, Dictionary<string, string>> cache = new(StringComparer.Ordinal);
    private static readonly ProviderField[] emailFields =
    [
        new("Host", "SMTP host", "text"), new("Port", "Port", "number"), new("Security", "TLS mode", "tls"),
        new("Username", "SMTP login", "text"), new("Password", "SMTP key or password", "password"),
        new("FromAddress", "Verified sender email", "email"), new("FromName", "Sender name", "text")
    ];
    private static readonly ProviderField[] slackFields = [new("BotToken", "Slack bot token", "password")];

    public static ProviderField[] Fields(string channel) => channel switch
    {
        DeliveryChannels.Email => emailFields,
        DeliveryChannels.Slack => slackFields,
        _ => []
    };

    public EmailOptions Email
    {
        get
        {
            Dictionary<string, string> values = Read(DeliveryChannels.Email);
            return new EmailOptions
            {
                Enabled = values.GetValueOrDefault("UiConfigured") == "1" || options.Value.Email.Enabled,
                Host = Value(values, "Host"), Port = int.TryParse(Value(values, "Port"), out int port) ? port : 587,
                Security = Value(values, "Security"), Username = Value(values, "Username"),
                Password = Value(values, "Password"), FromAddress = Value(values, "FromAddress"),
                FromName = Value(values, "FromName")
            };
        }
    }

    public SlackOptions Slack
    {
        get
        {
            Dictionary<string, string> values = Read(DeliveryChannels.Slack);
            return new SlackOptions { Enabled = values.GetValueOrDefault("UiConfigured") == "1" || options.Value.Slack.Enabled,
                BotToken = Value(values, "BotToken") };
        }
    }

    public object SafeView(string channel)
    {
        ProviderField[] fields = Fields(channel);
        Dictionary<string, string> values = Read(channel);
        return new
        {
            fields,
            values = fields.Where(field => field.Type != "password")
                .ToDictionary(field => field.Key, field => Value(values, field.Key)),
            hasSecret = fields.Any(field => field.Type == "password" && Value(values, field.Key).Length != 0)
        };
    }

    public async Task<IResult> SaveAsync(string channel, ProviderConfigInput input, CancellationToken token)
    {
        ProviderField[] fields = Fields(channel);
        if (fields.Length == 0) return Results.NotFound();
        if (input.Values is null || input.Values.Keys.Any(key => !fields.Any(field => field.Key == key)))
            return Results.BadRequest(new { message = "Invalid provider settings." });
        Dictionary<string, string> values = new(Read(channel), StringComparer.Ordinal);
        foreach (ProviderField field in fields)
        {
            if (!input.Values.TryGetValue(field.Key, out string? raw)) continue;
            string cleaned = raw?.Trim() ?? "";
            if (cleaned.Length > 500 || cleaned.Any(char.IsControl))
                return Results.BadRequest(new { message = "One of the settings is invalid." });
            if (field.Type != "password" || cleaned.Length != 0) values[field.Key] = cleaned;
        }

        string? reason = Validate(channel, values);
        if (reason is not null) return Results.BadRequest(new { message = reason });
        values["UiConfigured"] = "1";
        string stored = protection.CreateProtector("alert-provider:" + channel).Protect(JsonSerializer.Serialize(values));
        await db.Database.ExecuteSqlAsync($"""
            INSERT INTO StoredChannelConfigs (Channel, ProtectedJson) VALUES ({channel}, {stored})
            ON CONFLICT (Channel) DO UPDATE SET ProtectedJson = excluded.ProtectedJson
            """, token);
        cache[channel] = values;
        return Results.NoContent();
    }

    private Dictionary<string, string> Read(string channel)
    {
        if (cache.TryGetValue(channel, out Dictionary<string, string>? values)) return values;
        string? encrypted = db.StoredChannelConfigs.AsNoTracking().Where(row => row.Channel == channel)
            .Select(row => row.ProtectedJson).SingleOrDefault();
        if (encrypted is null) return cache[channel] = Fallback(channel);
        try
        {
            string json = protection.CreateProtector("alert-provider:" + channel).Unprotect(encrypted);
            return cache[channel] = JsonSerializer.Deserialize<Dictionary<string, string>>(json) ?? [];
        }
        catch (Exception error) when (error is CryptographicException or JsonException)
        {
            return cache[channel] = [];
        }
    }

    private Dictionary<string, string> Fallback(string channel)
    {
        EmailOptions email = options.Value.Email;
        return channel == DeliveryChannels.Email
            ? new Dictionary<string, string>
            {
                ["Host"] = email.Host, ["Port"] = email.Port.ToString(System.Globalization.CultureInfo.InvariantCulture),
                ["Security"] = email.Security, ["Username"] = email.Username, ["Password"] = email.Password,
                ["FromAddress"] = email.FromAddress, ["FromName"] = email.FromName
            }
            : channel == DeliveryChannels.Slack
                ? new Dictionary<string, string> { ["BotToken"] = options.Value.Slack.BotToken }
                : [];
    }

    private static string Value(Dictionary<string, string> values, string key) => values.GetValueOrDefault(key) ?? "";

    private static string? Validate(string channel, Dictionary<string, string> values)
    {
        if (channel == DeliveryChannels.Slack)
            return Value(values, "BotToken").StartsWith("xoxb-", StringComparison.Ordinal) ? null : "Enter a Slack bot token beginning with xoxb-.";
        if (Uri.CheckHostName(Value(values, "Host")) != UriHostNameType.Dns ||
            !int.TryParse(Value(values, "Port"), out int port) || port is < 1 or > 65535 ||
            Value(values, "Security") is not ("StartTls" or "SslOnConnect") ||
            !MailboxAddress.TryParse(Value(values, "FromAddress"), out _))
            return "Enter a valid SMTP host, port, TLS mode and verified sender address.";
        return null;
    }
}
