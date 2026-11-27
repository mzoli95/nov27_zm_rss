using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace WorldEventAlerts.Delivery;

public sealed class SlackSender(HttpClient http, IOptions<NotificationOptions> options) : INotificationSender
{
    private SlackOptions Settings => options.Value.Slack;
    public string Channel => DeliveryChannels.Slack;
    public bool Configured => Settings.BotToken.StartsWith("xoxb-", StringComparison.Ordinal);
    public bool EnabledByDefault => Settings.Enabled;

    public async Task<DeliveryStatus> SendAsync(DeliveryMessage message, CancellationToken token)
    {
        bool sending = false;
        try
        {
            using HttpRequestMessage lookup = CreateRequest(HttpMethod.Get,
                "users.lookupByEmail?email=" + Uri.EscapeDataString(message.Email));
            using HttpResponseMessage userReply = await http.SendAsync(lookup, token);
            if (!userReply.IsSuccessStatusCode) return DeliveryStatus.Failed;
            using JsonDocument user = await ReadAsync(userReply, token);
            if (!IsOk(user) || !user.RootElement.TryGetProperty("user", out JsonElement account) ||
                !account.TryGetProperty("id", out JsonElement id) || id.GetString() is not string slackUser)
                return DeliveryStatus.Failed;

            using HttpRequestMessage open = CreateRequest(HttpMethod.Post, "conversations.open");
            open.Content = JsonContent.Create(new { users = slackUser });
            using HttpResponseMessage openReply = await http.SendAsync(open, token);
            if (!openReply.IsSuccessStatusCode) return DeliveryStatus.Failed;
            using JsonDocument channel = await ReadAsync(openReply, token);
            if (!IsOk(channel) || !channel.RootElement.TryGetProperty("channel", out JsonElement conversation) ||
                !conversation.TryGetProperty("id", out JsonElement conversationId) ||
                conversationId.GetString() is not string destination) return DeliveryStatus.Failed;

            using HttpRequestMessage post = CreateRequest(HttpMethod.Post, "chat.postMessage");
            post.Content = JsonContent.Create(new
            {
                channel = destination, text = message.Title + "\n" + message.Url,
                mrkdwn = false, unfurl_links = false, unfurl_media = false
            });
            sending = true;
            using HttpResponseMessage delivery = await http.SendAsync(post, token);
            if ((int)delivery.StatusCode >= 500) return DeliveryStatus.Ambiguous;
            if (delivery.StatusCode != HttpStatusCode.OK) return DeliveryStatus.Failed;
            using JsonDocument result = await ReadAsync(delivery, token);
            return IsOk(result) ? DeliveryStatus.Accepted : DeliveryStatus.Failed;
        }
        catch (Exception error) when (!token.IsCancellationRequested &&
            error is (HttpRequestException or IOException or JsonException or OperationCanceledException))
        {
            return sending ? DeliveryStatus.Ambiguous : DeliveryStatus.Failed;
        }
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
