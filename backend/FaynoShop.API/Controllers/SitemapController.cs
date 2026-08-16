using System.Text;
using System.Xml;
using FaynoShop.API.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FaynoShop.API.Controllers;

[ApiController]
[AllowAnonymous]
[Produces("application/xml")]
public sealed class SitemapController : ControllerBase
{
    private const string SiteOrigin = "https://f-n.fun";
    private static readonly string[] Locales = ["ua", "en"];

    private readonly AppDbContext _db;

    public SitemapController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("/sitemap.xml")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(CancellationToken cancellationToken)
    {
        var productSlugs = await _db.Products
            .AsNoTracking()
            .Where(p => p.IsActive)
            .Select(p => p.Slug)
            .OrderBy(s => s)
            .ToListAsync(cancellationToken);

        var categorySlugs = await _db.Categories
            .AsNoTracking()
            .Select(c => c.Slug)
            .OrderBy(s => s)
            .ToListAsync(cancellationToken);

        var newsSlugs = await _db.NewsPosts
            .AsNoTracking()
            .Where(n => n.IsPublished)
            .Select(n => n.Slug)
            .OrderBy(s => s)
            .ToListAsync(cancellationToken);

        var xml = BuildSitemap(productSlugs, categorySlugs, newsSlugs);
        return Content(xml, "application/xml", Encoding.UTF8);
    }

    private static string BuildSitemap(
        IReadOnlyList<string> productSlugs,
        IReadOnlyList<string> categorySlugs,
        IReadOnlyList<string> newsSlugs)
    {
        var settings = new XmlWriterSettings
        {
            Async = false,
            Encoding = new UTF8Encoding(encoderShouldEmitUTF8Identifier: false),
            Indent = true,
            OmitXmlDeclaration = false,
        };

        using var stream = new MemoryStream();
        using (var writer = XmlWriter.Create(stream, settings))
        {
            writer.WriteStartDocument();
            writer.WriteStartElement("urlset", "http://www.sitemaps.org/schemas/sitemap/0.9");

            foreach (var locale in Locales)
            {
                WriteUrl(writer, $"{SiteOrigin}/{locale}", "1.0");
                WriteUrl(writer, $"{SiteOrigin}/{locale}/catalog", "0.9");
                WriteUrl(writer, $"{SiteOrigin}/{locale}/about", "0.5");
                WriteUrl(writer, $"{SiteOrigin}/{locale}/contacts", "0.5");
                WriteUrl(writer, $"{SiteOrigin}/{locale}/news", "0.6");
                WriteUrl(writer, $"{SiteOrigin}/{locale}/payment-delivery", "0.5");
            }

            foreach (var slug in productSlugs)
            {
                foreach (var locale in Locales)
                {
                    WriteUrl(writer, $"{SiteOrigin}/{locale}/catalog/{slug}", "0.8");
                }
            }

            foreach (var slug in categorySlugs)
            {
                foreach (var locale in Locales)
                {
                    WriteUrl(writer, $"{SiteOrigin}/{locale}/catalog?category={slug}", "0.9");
                }
            }

            foreach (var slug in newsSlugs)
            {
                foreach (var locale in Locales)
                {
                    WriteUrl(writer, $"{SiteOrigin}/{locale}/news/{slug}", "0.6");
                }
            }

            writer.WriteEndElement();
            writer.WriteEndDocument();
        }

        return Encoding.UTF8.GetString(stream.ToArray());
    }

    private static void WriteUrl(XmlWriter writer, string loc, string priority)
    {
        writer.WriteStartElement("url");
        writer.WriteElementString("loc", loc);
        writer.WriteElementString("changefreq", "weekly");
        writer.WriteElementString("priority", priority);
        writer.WriteEndElement();
    }
}
