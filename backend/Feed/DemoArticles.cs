using Microsoft.EntityFrameworkCore;

namespace WorldEventAlerts.Feed;

public static class DemoArticles
{
    public static async Task InitializeAsync(FeedDb database)
    {
        if (await database.Articles.AnyAsync())
        {
            await database.Articles.Where(article => article.Source == "Demo fixture" && article.ImageUrl == null && !article.Archived &&
                    (article.Topic == "General News" || article.Topic == "Crypto" || article.Topic == "Science & Technology"))
                .ExecuteUpdateAsync(update => update.SetProperty(article => article.ImageUrl, article =>
                    article.Topic == "General News" ? "/demo/world.jpg" :
                    article.Topic == "Crypto" ? "/demo/crypto.jpg" : "/demo/technology.jpg"));
            return;
        }

        (string Title, string Topic, string Description, string Url, string? Image)[] examples =
        {
            ("World briefing", "General News", "A sample roundup of international headlines.", "https://www.bbc.com/news/world", "/demo/world.jpg"),
            ("Digital assets briefing", "Crypto", "A sample summary of developments in digital assets.", "https://cointelegraph.com/", "/demo/crypto.jpg"),
            ("Market briefing", "Stock Market", "A sample update on global stock markets.", "https://www.bbc.com/news/business", null),
            ("Natural hazards briefing", "Natural Disasters", "A sample update on natural hazards and preparedness.", "https://www.bbc.com/news/world", null),
            ("Technology briefing", "Science & Technology", "A sample roundup of science and technology stories.", "https://www.bbc.com/news/technology", "/demo/technology.jpg"),
        };

        DateTime date = new(2026, 11, 1, 12, 0, 0, DateTimeKind.Utc);
        IEnumerable<Article> articles = Enumerable.Range(1, 26).Select(id =>
        {
            (string title, string topic, string description, string url, string? image) = examples[(id - 1) % examples.Length];
            return new Article(id, $"{title} #{id}", description, topic, "Demo fixture", image, url, date.AddDays(id - 1));
        });
        database.Articles.AddRange(articles);
        await database.SaveChangesAsync();
    }
}
