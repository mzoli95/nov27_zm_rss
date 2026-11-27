using Hangfire;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using WorldEventAlerts.Feed;

namespace WorldEventAlerts.News;

public sealed record ScheduleIntervals(int ImportMinutes, int ArchiveMinutes);

public sealed class NewsSchedules(FeedDb db, IRecurringJobManager recurring, IOptions<NewsOptions> options)
{
    private static readonly int[] importOptions = [5, 6, 10, 12, 15, 20, 30, 60];
    private static readonly int[] archiveOptions = [30, 60, 120, 180, 240, 360, 480, 720, 1440];

    public async Task<ScheduleIntervals> ReadAsync(CancellationToken token) =>
        await db.Database.SqlQuery<ScheduleIntervals>(
            $"SELECT ImportMinutes, ArchiveMinutes FROM NewsSchedule WHERE Id = 1").SingleOrDefaultAsync(token)
        ?? new(importOptions.Contains(options.Value.PollingIntervalMinutes) ? options.Value.PollingIntervalMinutes : 30,
            1440);

    public async Task<IResult> ViewAsync(CancellationToken token) => Results.Ok(new
    {
        intervals = await ReadAsync(token), importOptions, archiveOptions, importEnabled = options.Value.Enabled
    });

    public async Task<IResult> SaveAsync(ScheduleIntervals intervals, CancellationToken token)
    {
        if (!importOptions.Contains(intervals.ImportMinutes) || !archiveOptions.Contains(intervals.ArchiveMinutes))
            return Results.BadRequest(new { message = "Select a supported interval for each job." });

        await using Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction transaction =
            await db.Database.BeginTransactionAsync(token);
        await db.Database.ExecuteSqlAsync($"""
            INSERT INTO NewsSchedule (Id, ImportMinutes, ArchiveMinutes)
            VALUES (1, {intervals.ImportMinutes}, {intervals.ArchiveMinutes})
            ON CONFLICT (Id) DO UPDATE SET ImportMinutes = excluded.ImportMinutes,
                ArchiveMinutes = excluded.ArchiveMinutes
            """, token);
        Apply(intervals);
        await transaction.CommitAsync(CancellationToken.None);
        return Results.NoContent();
    }

    public void Apply(ScheduleIntervals intervals)
    {
        if (options.Value.Enabled)
            recurring.AddOrUpdate<NewsJobs>("news-import", job => job.ImportAsync(CancellationToken.None),
                CronFor(intervals.ImportMinutes));
        recurring.AddOrUpdate<NewsJobs>("news-archive", job => job.ArchiveAsync(CancellationToken.None),
            CronFor(intervals.ArchiveMinutes));
    }

    private static string CronFor(int minutes) => minutes switch
    {
        1440 => "15 2 * * *",
        60 => "0 * * * *",
        > 60 => FormattableString.Invariant($"0 */{minutes / 60} * * *"),
        _ => FormattableString.Invariant($"*/{minutes} * * * *")
    };
}
