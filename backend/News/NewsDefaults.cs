using Microsoft.EntityFrameworkCore;
using WorldEventAlerts.Feed;

namespace WorldEventAlerts.News;

public static class NewsDefaults
{
    public static async Task InitializeAsync(FeedDb db)
    {
        if (await db.NewsSources.AnyAsync()) return;
        await using Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction transaction =
            await db.Database.BeginTransactionAsync();
        NewsSource world = new() { Name = "BBC World News", Url = "https://feeds.bbci.co.uk/news/world/rss.xml", Kind = SourceKind.Rss };
        NewsSource business = new() { Name = "BBC Business", Url = "https://feeds.bbci.co.uk/news/business/rss.xml", Kind = SourceKind.Rss };
        NewsSource tech = new() { Name = "BBC Technology", Url = "https://feeds.bbci.co.uk/news/technology/rss.xml", Kind = SourceKind.Rss };
        db.NewsSources.AddRange(world, business, tech);
        await db.SaveChangesAsync();
        db.SourceTopics.AddRange(
            new SourceTopic(world.Id, NewsTopics.General, ""),
            new SourceTopic(world.Id, NewsTopics.Wildlife, "wildlife,animal,species,conservation"),
            new SourceTopic(world.Id, NewsTopics.Cities, "city,cities,urban,mayor"),
            new SourceTopic(world.Id, NewsTopics.Politics, "election,parliament,government,politics"),
            new SourceTopic(world.Id, NewsTopics.Disasters, "earthquake,flood,wildfire,storm,disaster"),
            new SourceTopic(tech.Id, NewsTopics.Tech, ""),
            new SourceTopic(business.Id, NewsTopics.Economy, ""),
            new SourceTopic(business.Id, NewsTopics.Stocks, "stock,shares,wall street,market"),
            new SourceTopic(business.Id, NewsTopics.Crypto, "crypto,bitcoin,ethereum"));
        await db.SaveChangesAsync();
        await transaction.CommitAsync();
    }
}
