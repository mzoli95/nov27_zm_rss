namespace WorldEventAlerts.Feed;

public sealed record Article(
    int Id, string Title, string Description, string Topic, string Source,
    string? ImageUrl, string Url, DateTime PublishedAt)
{
    public bool Archived { get; init; }
}
