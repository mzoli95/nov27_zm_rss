using Microsoft.AspNetCore.Mvc;

namespace WorldEventAlerts.Feed;

public sealed class FeedQuery
{
    [FromQuery] public string? Topic { get; init; }
    [FromQuery] public string? Search { get; init; }
    [FromQuery] public string? Sort { get; init; }
    [FromQuery] public int? Cursor { get; init; }
    [FromQuery] public bool? Liked { get; init; }
    [FromQuery] public bool? Preferred { get; init; }
}

public sealed record LikeRequest(bool Liked);
public sealed record FeedArticle(int Id, string Title, string Description, string Topic, string Source,
    string? ImageUrl, string Url, DateTime PublishedAt, bool Liked);
public sealed record FeedPage(FeedArticle[] Items, int? NextCursor);
