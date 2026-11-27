using Microsoft.EntityFrameworkCore;

namespace WorldEventAlerts.Feed;

public static class DemoArticles
{
    public static async Task InitializeAsync(FeedDb database)
    {
        if (await database.Articles.AnyAsync()) return;

        var examples = new[]
        {
            ("World briefing", "General News", "A sample roundup of international headlines.", "https://www.bbc.com/news/world"),
            ("Digital assets briefing", "Crypto", "A sample summary of developments in digital assets.", "https://cointelegraph.com/"),
            ("Market briefing", "Stock Market", "A sample update on global stock markets.", "https://www.bbc.com/news/business"),
            ("Natural hazards briefing", "Natural Disasters", "A sample update on natural hazards and preparedness.", "https://www.bbc.com/news/world"),
            ("Technology briefing", "Science & Technology", "A sample roundup of science and technology stories.", "https://www.bbc.com/news/technology"),
        };

        var date = new DateTime(2026, 11, 1, 12, 0, 0, DateTimeKind.Utc);
        var articles = Enumerable.Range(1, 26).Select(id =>
        {
            var (title, topic, description, url) = examples[(id - 1) % examples.Length];
            return new Article(id, $"{title} #{id}", description, topic, "Demo fixture", null, url, date.AddDays(id - 1));
        });
        database.Articles.AddRange(articles);
        await database.SaveChangesAsync();
    }
}
