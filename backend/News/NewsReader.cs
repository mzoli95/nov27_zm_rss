using System.Globalization;
using System.Text.Json;
using System.Xml;
using System.Xml.Linq;

namespace WorldEventAlerts.News;

public static class NewsReader
{
    public static async Task<IReadOnlyList<NewsItem>> ReadAsync(Stream body, SourceKind kind, CancellationToken token)
    {
        if (kind == SourceKind.Usgs)
        {
            using JsonDocument document = await JsonDocument.ParseAsync(body, cancellationToken: token);
            return document.RootElement.GetProperty("features").EnumerateArray().Take(100)
                .Select(ReadEarthquake).OfType<NewsItem>().ToArray();
        }
        using XmlReader reader = XmlReader.Create(body, new XmlReaderSettings
        {
            Async = true, DtdProcessing = DtdProcessing.Prohibit, MaxCharactersInDocument = 2_000_000
        });
        XDocument xml = await XDocument.LoadAsync(reader, LoadOptions.None, token);
        return xml.Descendants().Where(node => node.Name.LocalName is "item" or "entry")
            .Take(100).Select(ReadArticle).OfType<NewsItem>().ToArray();
    }

    private static NewsItem? ReadArticle(XElement element)
    {
        XElement? link = element.Elements().FirstOrDefault(node => node.Name.LocalName == "link" &&
            ((string?)node.Attribute("rel") is null or "alternate"));
        string? url = WebUrl((string?)link?.Attribute("href") ?? link?.Value);
        string? title = Value(element, "title");
        if (url is null || string.IsNullOrWhiteSpace(title)) return null;

        string? date = Value(element, "pubDate") ?? Value(element, "published") ?? Value(element, "updated");
        if (!DateTimeOffset.TryParse(date, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out DateTimeOffset published))
            return null;

        XElement? image = element.Descendants().FirstOrDefault(node =>
            node.Name.LocalName == "thumbnail" ||
            (node.Name.LocalName is "content" or "enclosure" &&
             ((string?)node.Attribute("medium") == "image" ||
              ((string?)node.Attribute("type"))?.StartsWith("image/", StringComparison.OrdinalIgnoreCase) == true)));
        string? imageUrl = WebUrl((string?)image?.Attribute("url"));
        string description = Value(element, "description") ?? Value(element, "summary") ?? "";
        return new NewsItem(url, title.Trim(), description.Trim(), imageUrl, published.UtcDateTime);
    }

    private static NewsItem? ReadEarthquake(JsonElement element)
    {
        JsonElement properties = element.GetProperty("properties");
        string? url = WebUrl(properties.GetProperty("url").GetString());
        string? title = properties.GetProperty("title").GetString();
        if (url is null || string.IsNullOrWhiteSpace(title) ||
            !properties.GetProperty("time").TryGetInt64(out long time)) return null;
        return new NewsItem(url, title, "Earthquake report from the USGS.", null,
            DateTimeOffset.FromUnixTimeMilliseconds(time).UtcDateTime);
    }

    private static string? Value(XElement parent, string name) =>
        parent.Elements().FirstOrDefault(node => node.Name.LocalName == name)?.Value;

    public static string? WebUrl(string? value)
    {
        if (!Uri.TryCreate(value, UriKind.Absolute, out Uri? uri) ||
            uri.Scheme is not ("http" or "https") || uri.UserInfo.Length != 0) return null;
        return uri.AbsoluteUri;
    }
}
