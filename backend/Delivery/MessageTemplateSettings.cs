using System.Text.Json;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using WorldEventAlerts.Feed;

namespace WorldEventAlerts.Delivery;

public sealed record MessageTemplate(string Subject, string Introduction)
{
    public static MessageTemplate Default { get; } = new(
        "World Event Alerts: {count} new articles", "New articles matching your alerts");

    public string RenderSubject(int count) => this == Default && count == 1
        ? "World Event Alerts: 1 new article"
        : Subject.Replace("{count}", count.ToString(System.Globalization.CultureInfo.InvariantCulture),
            StringComparison.Ordinal);
}

public sealed class MessageTemplateSettings(FeedDb db, IDataProtectionProvider protection)
{
    private const string Key = "message-template";

    public async Task<MessageTemplate> ReadAsync(CancellationToken token)
    {
        string? stored = await db.StoredChannelConfigs.AsNoTracking().Where(row => row.Channel == Key)
            .Select(row => row.ProtectedJson).SingleOrDefaultAsync(token);
        if (stored is null) return MessageTemplate.Default;
        try
        {
            string json = protection.CreateProtector(Key).Unprotect(stored);
            return JsonSerializer.Deserialize<MessageTemplate>(json) ?? MessageTemplate.Default;
        }
        catch (Exception error) when (error is System.Security.Cryptography.CryptographicException or JsonException)
        {
            return MessageTemplate.Default;
        }
    }

    public async Task<IResult> SaveAsync(MessageTemplate input, CancellationToken token)
    {
        if (string.IsNullOrWhiteSpace(input.Subject) || input.Subject.Length > 120 ||
            input.Subject.Any(char.IsControl) || string.IsNullOrWhiteSpace(input.Introduction) ||
            input.Introduction.Length > 300 || input.Introduction.Any(char.IsControl))
            return Results.BadRequest(new { message = "Enter a single-line subject and introduction within the limits." });

        string json = JsonSerializer.Serialize(new MessageTemplate(input.Subject.Trim(), input.Introduction.Trim()));
        string stored = protection.CreateProtector(Key).Protect(json);
        await db.Database.ExecuteSqlAsync($"""
            INSERT INTO StoredChannelConfigs (Channel, ProtectedJson) VALUES ({Key}, {stored})
            ON CONFLICT (Channel) DO UPDATE SET ProtectedJson = excluded.ProtectedJson
            """, token);
        return Results.NoContent();
    }

    public Task<int> ResetAsync(CancellationToken token) =>
        db.StoredChannelConfigs.Where(row => row.Channel == Key).ExecuteDeleteAsync(token);
}
