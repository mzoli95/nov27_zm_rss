using System.Security.Claims;
using WorldEventAlerts.Auth;

namespace WorldEventAlerts.Delivery;

public sealed class DeliveryTest(
    IEnumerable<INotificationSender> senders, SupabaseDirectory directory, MessageTemplateSettings templates)
{
    public static Task<IResult> SendAsync(string channel, ClaimsPrincipal actor, DeliveryTest test, CancellationToken token) =>
        test.SendToAdminAsync(channel, actor, token);

    private async Task<IResult> SendToAdminAsync(string channel, ClaimsPrincipal actor, CancellationToken token)
    {
        INotificationSender? sender = senders.FirstOrDefault(item => item.Channel == channel);
        if (sender is null) return Results.NotFound();
        if (!sender.Configured || !directory.IsConfigured)
            return Results.BadRequest(new { message = "Save the provider configuration before sending a test." });
        if (!Guid.TryParse(actor.FindFirstValue(ClaimTypes.NameIdentifier), out Guid userId))
            return Results.Forbid();

        DirectoryUser? recipient;
        try { recipient = await directory.FindAsync(userId, token); }
        catch (Exception error) when (SupabaseDirectory.IsFailure(error, token))
        {
            return Results.Problem("Could not look up your account.", statusCode: 502);
        }
        if (recipient?.EmailConfirmedAt is null || string.IsNullOrWhiteSpace(recipient.Email))
            return Results.BadRequest(new { message = "Confirm your account email before sending a test." });

        MessageTemplate template = await templates.ReadAsync(token);
        string subject = template.RenderSubject(1);
        string testSubject = subject.Length > 140 ? subject[..140] : subject;
        DeliveryMessage message = new(recipient.Email,
            [new DeliveryArticle("Sample news link", "https://www.bbc.com/news")],
            Template: template with { Subject = "[Test] " + testSubject });
        if (sender is SlackSender slack)
            return Results.Ok(await slack.SendWithDetailsAsync(message, token));
        DeliveryStatus status = await sender.SendAsync(message, token);
        return Results.Ok(new { status });
    }
}
