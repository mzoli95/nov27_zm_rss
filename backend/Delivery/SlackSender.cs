using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;

namespace WorldEventAlerts.Delivery;

public sealed record SlackDeliveryResult(DeliveryStatus Status, string? Detail = null);

public sealed class SlackSender(HttpClient http, ProviderSettings options) : INotificationSender
{
    private SlackOptions Settings => options.Slack;
    public string Channel => DeliveryChannels.Slack;
    public bool Configured => Settings.BotToken.StartsWith("xoxb-", StringComparison.Ordinal);
    public bool EnabledByDefault => Settings.Enabled;

    public async Task<DeliveryStatus> SendAsync(DeliveryMessage message, CancellationToken token) =>
        (await SendWithDetailsAsync(message, token)).Status;

    public async Task<SlackDeliveryResult> SendWithDetailsAsync(DeliveryMessage message, CancellationToken token)
    {
        string stage = "users.lookupByEmail";
        try
        {
            using HttpRequestMessage lookup = CreateRequest(HttpMethod.Get,
                "users.lookupByEmail?email=" + Uri.EscapeDataString(message.Email));
            using HttpResponseMessage userReply = await http.SendAsync(lookup, token);
            if (!userReply.IsSuccessStatusCode) return HttpFailure(stage, userReply.StatusCode);
            using JsonDocument user = await ReadAsync(userReply, token);
            if (!IsOk(user) || !user.RootElement.TryGetProperty("user", out JsonElement account) ||
                !account.TryGetProperty("id", out JsonElement id) || id.GetString() is not string slackUser)
                return SlackFailure(stage, user);

            stage = "conversations.open";
            using HttpRequestMessage open = CreateRequest(HttpMethod.Post, "conversations.open");
            open.Content = JsonContent.Create(new { users = slackUser });
            using HttpResponseMessage openReply = await http.SendAsync(open, token);
            if (!openReply.IsSuccessStatusCode) return HttpFailure(stage, openReply.StatusCode);
            using JsonDocument channel = await ReadAsync(openReply, token);
            if (!IsOk(channel) || !channel.RootElement.TryGetProperty("channel", out JsonElement conversation) ||
                !conversation.TryGetProperty("id", out JsonElement conversationId) ||
                conversationId.GetString() is not string destination) return SlackFailure(stage, channel);

            using HttpRequestMessage post = CreateRequest(HttpMethod.Post, "chat.postMessage");
            string heading = message.Content.RenderSubject(message.Articles.Count);
            List<object> blocks =
            [
                new { type = "header", text = new { type = "plain_text", text = heading } },
                new { type = "section", text = new { type = "plain_text", text = message.Content.Introduction } }
            ];
            blocks.AddRange(message.Articles.Select(article => new
            {
                type = "section", text = new { type = "mrkdwn", text = ArticleLink(article) }
            }));
            post.Content = JsonContent.Create(new
            {
                channel = destination, text = heading, mrkdwn = false, blocks,
                unfurl_links = false, unfurl_media = false
            });
            stage = "chat.postMessage";
            using HttpResponseMessage delivery = await http.SendAsync(post, token);
            if (delivery.StatusCode != HttpStatusCode.OK) return HttpFailure(stage, delivery.StatusCode);
            using JsonDocument result = await ReadAsync(delivery, token);
            return IsOk(result) ? new(DeliveryStatus.Accepted) : SlackFailure(stage, result);
        }
        catch (Exception error) when (!token.IsCancellationRequested &&
            error is (HttpRequestException or IOException or JsonException or OperationCanceledException))
        {
            return new(stage == "chat.postMessage" ? DeliveryStatus.Ambiguous : DeliveryStatus.Failed,
                $"Slack {stage} did not return a readable response.");
        }
    }

    private static SlackDeliveryResult HttpFailure(string stage, HttpStatusCode code) =>
        new(stage == "chat.postMessage" && (int)code >= 500 ? DeliveryStatus.Ambiguous : DeliveryStatus.Failed,
            $"Slack {stage} returned HTTP {(int)code}.");

    private static SlackDeliveryResult SlackFailure(string stage, JsonDocument payload)
    {
        string? error = payload.RootElement.TryGetProperty("error", out JsonElement field) &&
            field.ValueKind == JsonValueKind.String ? field.GetString() : null;
        string hint = error switch
        {
            "users_not_found" => "The verified app email has no matching member in the bot's Slack workspace.",
            "missing_scope" => stage switch
            {
                "users.lookupByEmail" => "Add users:read.email to Bot Token Scopes and reinstall the Slack app.",
                "conversations.open" => "Add im:write to Bot Token Scopes and reinstall the Slack app.",
                _ => "Add chat:write to Bot Token Scopes and reinstall the Slack app."
            },
            "invalid_auth" or "token_revoked" or "token_expired" or "not_authed" =>
                "Save the active xoxb- bot token from the correct Slack workspace.",
            "account_inactive" => "Check that the bot and recipient are active in the Slack workspace.",
            "channel_not_found" or "user_not_found" or "user_not_visible" =>
                "Check that the bot and the intended recipient belong to the same Slack workspace.",
            "messages_tab_disabled" => "Enable the Messages Tab under App Home in the Slack app settings.",
            "no_permission" or "not_in_channel" =>
                "Check that the installed bot can post in the direct conversation.",
            "restricted_action" => "A Slack workspace policy prevents the bot from posting.",
            "invalid_blocks" or "invalid_blocks_format" or "msg_blocks_too_long" =>
                "Slack rejected the message blocks. Review the saved template.",
            _ => "Slack did not accept the request. Check the app installation and bot permissions."
        };
        string code = error is { Length: > 0 and <= 64 } &&
            error.All(character => character is >= 'a' and <= 'z' or >= '0' and <= '9' or '_')
            ? $" ({error})" : "";
        return new(DeliveryStatus.Failed, $"Slack {stage}{code}: {hint}");
    }

    private static string ArticleLink(DeliveryArticle article)
    {
        string url = article.Url.Replace("|", "%7C").Replace(">", "%3E").Replace("<", "%3C");
        string title = article.Title[..Math.Min(article.Title.Length, 160)]
            .Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;").Replace("|", "¦");
        return $"<{url}|{title}>";
    }

    private HttpRequestMessage CreateRequest(HttpMethod method, string path)
    {
        HttpRequestMessage request = new(method, new Uri("https://slack.com/api/" + path));
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", Settings.BotToken);
        return request;
    }

    private static async Task<JsonDocument> ReadAsync(HttpResponseMessage reply, CancellationToken token) =>
        await JsonDocument.ParseAsync(await reply.Content.ReadAsStreamAsync(token), cancellationToken: token);

    private static bool IsOk(JsonDocument payload) =>
        payload.RootElement.TryGetProperty("ok", out JsonElement value) && value.ValueKind == JsonValueKind.True;
}
