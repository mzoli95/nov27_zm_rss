namespace WorldEventAlerts.News;

public enum SourceKind { Rss, Usgs }

public static class NewsTopics
{
    public const string General = "General News";
    public const string Tech = "Science & Technology";
    public const string Wildlife = "Wildlife";
    public const string Cities = "Cities";
    public const string Politics = "Politics";
    public const string Stocks = "Stock Market";
    public const string Economy = "Economy";
    public const string Crypto = "Crypto";
    public const string Disasters = "Natural Disasters";

    public static readonly IReadOnlyList<string> All = [General, Tech, Wildlife, Cities, Politics, Stocks, Economy, Crypto, Disasters];
}

public sealed record UserTopic(Guid UserId, string Topic);
public sealed record UserLabel(Guid UserId, string Label);
public sealed record ArticleTopic(int ArticleId, string Topic);
public sealed record ArticleAlert(Guid UserId, int ArticleId, DateTime CreatedAt, bool Read);
public sealed record ImportedArticle(string CanonicalUrl, int ArticleId, string HeadlineKey, string Day);
public sealed record SourceTopic(int SourceId, string Topic, string Keywords);
public sealed class NewsSource
{
    public int Id { get; init; }
    public required string Name { get; set; }
    public required string Url { get; set; }
    public SourceKind Kind { get; set; }
    public bool Enabled { get; set; } = true;
    public DateTime? LastSuccess { get; set; }
    public string? Status { get; set; }
}
public sealed record SourceMappingInput(string Topic, string? Keywords);
public sealed record SourceUpdate(string Name, string Url, SourceKind Kind, SourceMappingInput[] Topics);
public sealed record SourceAvailability(bool Enabled);
public sealed record NewsItem(string Url, string Title, string Description, string? ImageUrl, DateTime PublishedAt);
public sealed record Preferences(string[] Topics, string[] Labels);
