using System.Globalization;
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
    private const string XhtmlNs = "http://www.w3.org/1999/xhtml";
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
        var products = await _db.Products
            .AsNoTracking()
            .Where(p => p.IsActive)
            .Select(p => new { p.Slug, p.UpdatedAt })
            .OrderBy(p => p.Slug)
            .ToListAsync(cancellationToken);

        var news = await _db.NewsPosts
            .AsNoTracking()
            .Where(n => n.IsPublished)
            .Select(n => new { n.Slug, n.UpdatedAt })
            .OrderBy(n => n.Slug)
            .ToListAsync(cancellationToken);

        var xml = BuildSitemap(
            products.Select(p => (p.Slug, (DateTime?)p.UpdatedAt)).ToList(),
            news.Select(n => (n.Slug, (DateTime?)n.UpdatedAt)).ToList());
        return Content(xml, "application/xml", Encoding.UTF8);
    }

    /// <summary>XML builder (internal for unit tests that assert write-time exceptions).</summary>
    internal static string BuildSitemap(
        IReadOnlyList<(string Slug, DateTime? UpdatedAt)> products,
        IReadOnlyList<(string Slug, DateTime? UpdatedAt)> news)
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
            // Do not WriteAttributeString("xmlns:xhtml", …) — XmlWriter treats the first
            // arg as a local name; a colon is illegal and throws at runtime (HTTP 500).
            // xhtml:link elements declare the namespace themselves.

            foreach (var locale in Locales)
            {
                WriteUrl(writer, locale, path: "");
                WriteUrl(writer, locale, path: "catalog");
                WriteUrl(writer, locale, path: "about");
                WriteUrl(writer, locale, path: "contacts");
                WriteUrl(writer, locale, path: "news");
                WriteUrl(writer, locale, path: "payment-delivery");
            }

            foreach (var (slug, updatedAt) in products)
            {
                foreach (var locale in Locales)
                {
                    WriteUrl(writer, locale, path: $"catalog/{slug}", lastmod: updatedAt);
                }
            }

            foreach (var (slug, updatedAt) in news)
            {
                foreach (var locale in Locales)
                {
                    WriteUrl(writer, locale, path: $"news/{slug}", lastmod: updatedAt);
                }
            }

            writer.WriteEndElement();
            writer.WriteEndDocument();
        }

        return Encoding.UTF8.GetString(stream.ToArray());
    }

    private static void WriteUrl(
        XmlWriter writer,
        string locale,
        string path,
        DateTime? lastmod = null)
    {
        var suffix = string.IsNullOrEmpty(path) ? "" : $"/{path}";
        var loc = $"{SiteOrigin}/{locale}{suffix}";

        writer.WriteStartElement("url");
        writer.WriteElementString("loc", loc);

        if (lastmod is { } when)
        {
            writer.WriteElementString(
                "lastmod",
                when.ToUniversalTime().ToString("yyyy-MM-dd", CultureInfo.InvariantCulture));
        }

        WriteAlternate(writer, "uk", $"{SiteOrigin}/ua{suffix}");
        WriteAlternate(writer, "en", $"{SiteOrigin}/en{suffix}");
        WriteAlternate(writer, "x-default", $"{SiteOrigin}/ua{suffix}");

        writer.WriteEndElement();
    }

    private static void WriteAlternate(XmlWriter writer, string hreflang, string href)
    {
        writer.WriteStartElement("xhtml", "link", XhtmlNs);
        writer.WriteAttributeString("rel", "alternate");
        writer.WriteAttributeString("hreflang", hreflang);
        writer.WriteAttributeString("href", href);
        writer.WriteEndElement();
    }
}
