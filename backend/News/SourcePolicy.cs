using Microsoft.Extensions.Options;

namespace WorldEventAlerts.News;

public sealed class NewsOptions
{
    public bool Enabled { get; init; }
    public int PollingIntervalMinutes { get; init; } = 30;
    public string[] AllowedHosts { get; init; } = ["feeds.bbci.co.uk", "cointelegraph.com", "earthquake.usgs.gov"];
}

public sealed class SourcePolicy(IOptions<NewsOptions> settings)
{
    public bool IsAllowed(string? url, SourceKind kind)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out Uri? uri) || uri.Scheme != Uri.UriSchemeHttps ||
            !uri.IsDefaultPort || uri.UserInfo.Length != 0 || uri.Fragment.Length != 0 ||
            !settings.Value.AllowedHosts.Contains(uri.IdnHost, StringComparer.OrdinalIgnoreCase))
            return false;
        return kind == SourceKind.Rss || (kind == SourceKind.Usgs && uri.IdnHost == "earthquake.usgs.gov" &&
            uri.AbsolutePath.StartsWith("/earthquakes/feed/v1.0/summary/", StringComparison.Ordinal));
    }
}
