namespace FaynoShop.API.DTOs.Uploads;

public sealed record CompressAllImagesResultDto(
    int Processed,
    int Failed,
    long SavedKb,
    string[] Errors);
