namespace FaynoShop.API.Options;

/// <summary>
/// Where product image files are stored on disk.
/// On ephemeral hosts (Railway etc.) set RootPath to a mounted volume
/// so uploads survive redeploys; DB only stores relative /uploads/... URLs.
/// </summary>
public sealed class MediaStorageOptions
{
    public const string SectionName = "MediaStorage";

    /// <summary>
    /// Absolute directory that contains a <c>products</c> folder and is served at <c>/uploads</c>.
    /// Empty → <c>{ContentRoot}/wwwroot/uploads</c> (local / default).
    /// Env: <c>MediaStorage__RootPath</c> (e.g. <c>/data/uploads</c> on Railway).
    /// </summary>
    public string? RootPath { get; set; }
}
