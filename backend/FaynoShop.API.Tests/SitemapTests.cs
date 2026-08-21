using System.Xml.Linq;
using FaynoShop.API.Controllers;
using FaynoShop.API.Data;
using FaynoShop.API.Models;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace FaynoShop.API.Tests;

public sealed class SitemapTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public SitemapTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.UseSetting(WebHostDefaults.EnvironmentKey, "Testing");
        });
    }

    [Fact]
    public async Task Get_sitemap_xml_returns_200_valid_xml_with_hreflang_and_no_category_query()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await SeedAsync(db);

        var client = _factory.CreateClient();
        var response = await client.GetAsync("/sitemap.xml");

        Assert.Equal(System.Net.HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        var doc = XDocument.Parse(body);

        XNamespace sm = "http://www.sitemaps.org/schemas/sitemap/0.9";
        XNamespace xhtml = "http://www.w3.org/1999/xhtml";

        Assert.Equal("urlset", doc.Root?.Name.LocalName);
        Assert.Equal(sm.NamespaceName, doc.Root?.Name.NamespaceName);

        var urls = doc.Root!.Elements(sm + "url").ToList();
        Assert.NotEmpty(urls);

        foreach (var url in urls)
        {
            var loc = url.Element(sm + "loc")?.Value;
            Assert.False(string.IsNullOrWhiteSpace(loc));
            Assert.DoesNotContain("?category=", loc, StringComparison.OrdinalIgnoreCase);

            var firstChild = url.Elements().FirstOrDefault();
            Assert.Equal("loc", firstChild?.Name.LocalName);

            var alternates = url.Elements(xhtml + "link").ToList();
            Assert.Equal(3, alternates.Count);
            Assert.Contains(alternates, a => a.Attribute("hreflang")?.Value == "uk");
            Assert.Contains(alternates, a => a.Attribute("hreflang")?.Value == "en");
            Assert.Contains(alternates, a => a.Attribute("hreflang")?.Value == "x-default");
        }

        Assert.Contains(urls, u => (u.Element(sm + "loc")?.Value ?? "").Contains("/catalog/test-product", StringComparison.Ordinal));
        Assert.Contains(
            urls,
            u => (u.Element(sm + "loc")?.Value ?? "").Contains("/news/test-news", StringComparison.Ordinal)
                && u.Element(sm + "lastmod") is not null);
        Assert.Contains(
            urls,
            u => (u.Element(sm + "loc")?.Value ?? "").EndsWith("/ua/about", StringComparison.Ordinal)
                && u.Element(sm + "lastmod") is null);
    }

    [Fact]
    public void BuildSitemap_writes_valid_xml_without_throwing()
    {
        var xml = SitemapController.BuildSitemap(
            [("test-product", new DateTime(2026, 8, 1, 0, 0, 0, DateTimeKind.Utc))],
            [("test-news", new DateTime(2026, 8, 2, 0, 0, 0, DateTimeKind.Utc))]);

        var doc = XDocument.Parse(xml);
        Assert.Equal("urlset", doc.Root?.Name.LocalName);
        Assert.Contains("hreflang", xml, StringComparison.Ordinal);
        Assert.DoesNotContain("?category=", xml, StringComparison.OrdinalIgnoreCase);
    }

    private static async Task SeedAsync(AppDbContext db)
    {
        if (await db.Products.AnyAsync())
        {
            return;
        }

        var category = new Category
        {
            NameUk = "Тест",
            Slug = "test-cat",
            SortOrder = 1,
        };
        db.Categories.Add(category);
        await db.SaveChangesAsync();

        db.Products.Add(new Product
        {
            NameUk = "Тест товар",
            Slug = "test-product",
            CategoryId = category.Id,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = new DateTime(2026, 8, 1, 0, 0, 0, DateTimeKind.Utc),
        });
        db.NewsPosts.Add(new NewsPost
        {
            TitleUk = "Тест новина",
            Slug = "test-news",
            IsPublished = true,
            PublishedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = new DateTime(2026, 8, 2, 0, 0, 0, DateTimeKind.Utc),
        });
        await db.SaveChangesAsync();
    }
}
